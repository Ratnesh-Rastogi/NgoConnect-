import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { resolveCityCoordinates } from '../utils/geo.js';
import {
  saveFile,
  getFile,
  deleteFile,
  validateFileSignature
} from './storageService.js';

// Public listing: visitors can only see APPROVED NGOs
export const listApprovedNgos = async (filters = {}) => {
  const where = {
    verificationStatus: 'APPROVED'
  };

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  } else if (filters.category) {
    where.category = {
      OR: [
        { name: { contains: filters.category, mode: 'insensitive' } },
        { slug: { contains: filters.category, mode: 'insensitive' } }
      ]
    };
  }

  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }

  if (filters.search) {
    where.OR = [
      { orgName: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit || filters.take, 10) || 50, 1), 100);
  const skip = filters.skip ? Math.max(parseInt(filters.skip, 10) || 0, 0) : (page - 1) * limit;

  return prisma.ngoProfile.findMany({
    where,
    include: {
      category: true,
      services: { include: { category: true } }
    },
    orderBy: { orgName: 'asc' },
    take: limit,
    skip
  });
};

// Retrieve single NGO profile
export const getNgoById = async (id) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { id },
    include: {
      user: true,
      category: true,
      services: { include: { category: true } },
      documents: {
        orderBy: { createdAt: 'desc' }
      },
      verificationReviews: {
        include: { reviewer: true },
        orderBy: { createdAt: 'desc' }
      },
      requests: {
        where: { status: { in: ['OPEN', 'PARTIAL'] } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!ngo) {
    throw new AppError('NGO not found', 404);
  }

  return ngo;
};

// Admin only: list all NGOs across all verification statuses
export const listAllNgosForAdmin = async (queryOrStatus) => {
  const where = {};
  const status = typeof queryOrStatus === 'string' ? queryOrStatus : queryOrStatus?.status;
  if (status) {
    where.verificationStatus = status;
  }

  const filters = typeof queryOrStatus === 'object' && queryOrStatus !== null ? queryOrStatus : {};
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit || filters.take, 10) || 50, 1), 100);
  const skip = filters.skip ? Math.max(parseInt(filters.skip, 10) || 0, 0) : (page - 1) * limit;

  return prisma.ngoProfile.findMany({
    where,
    include: {
      user: true,
      category: true,
      documents: {
        orderBy: { createdAt: 'desc' }
      },
      verificationReviews: {
        include: { reviewer: true },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { requests: true, transfersReceived: true, documents: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip
  });
};

// Admin only: change verification status (APPROVED, REJECTED, SUSPENDED)
export const updateNgoStatus = async (adminUser, ngoId, { verificationStatus, verificationNotes, notes }) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { id: ngoId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found', 404);
  }

  const reason = (verificationNotes || notes || '').trim();

  // Rule: Reject requires a reason
  if (verificationStatus === 'REJECTED' && !reason) {
    throw new AppError('A reason is required when rejecting an NGO', 400);
  }

  // Rule: Admin APPROVED is blocked if the NGO has no documents
  if (verificationStatus === 'APPROVED') {
    const documentCount = await prisma.ngoDocument.count({
      where: { ngoProfileId: ngo.id }
    });
    if (documentCount === 0) {
      throw new AppError('Cannot approve an NGO without verification documents', 400);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ngoProfile.update({
      where: { id: ngoId },
      data: {
        verificationStatus,
        verificationNotes: reason || verificationNotes || notes || null
      },
      include: {
        user: true,
        category: true,
        documents: true,
        verificationReviews: {
          include: { reviewer: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Write audit review log
    await tx.ngoVerificationReview.create({
      data: {
        ngoProfileId: ngo.id,
        reviewerId: adminUser.id,
        fromStatus: ngo.verificationStatus,
        toStatus: verificationStatus,
        notes: reason || verificationNotes || notes || `Status changed to ${verificationStatus}`
      }
    });

    // Write notification to NGO user inside same transaction
    const finalReason = reason || verificationNotes || notes || '';
    let notifTitle = 'NGO Status Update';
    let notifMessage = `Your organization verification status was updated to ${verificationStatus}.`;

    if (verificationStatus === 'APPROVED') {
      notifTitle = 'Organization Approved';
      notifMessage = `Your organization (${ngo.orgName}) has been approved by the platform administrator.`;
    } else if (verificationStatus === 'REJECTED') {
      notifTitle = 'Verification Rejected';
      notifMessage = `Your organization verification was rejected: ${finalReason}`;
    } else if (verificationStatus === 'SUSPENDED') {
      notifTitle = 'Organization Suspended';
      notifMessage = `Your organization account has been suspended: ${finalReason || 'Suspended by administrator'}`;
    }

    await tx.notification.create({
      data: {
        userId: ngo.userId,
        type: `NGO_${verificationStatus}`,
        title: notifTitle,
        message: notifMessage
      }
    });

    return updated;
  });
};

// NGO owner only: update profile information
export const updateMyNgoProfile = async (userId, data) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { userId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found for this user', 404);
  }

  // Handle serviceCategoryIds validation
  let uniqueCategoryIds;
  if (data.serviceCategoryIds !== undefined) {
    uniqueCategoryIds = [...new Set(data.serviceCategoryIds)];
    if (uniqueCategoryIds.length > 10) {
      throw new AppError('At most 10 services allowed', 400);
    }
    if (uniqueCategoryIds.length > 0) {
      const existingCategories = await prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds } },
        select: { id: true }
      });
      if (existingCategories.length !== uniqueCategoryIds.length) {
        throw new AppError('One or more category IDs do not exist', 400);
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    if (uniqueCategoryIds !== undefined) {
      // Replace the NgoService rows inside one transaction
      await tx.ngoService.deleteMany({
        where: { ngoId: ngo.id }
      });
      if (uniqueCategoryIds.length > 0) {
        await tx.ngoService.createMany({
          data: uniqueCategoryIds.map((cid) => ({
            ngoId: ngo.id,
            categoryId: cid
          }))
        });
      }
    }

    return tx.ngoProfile.update({
      where: { id: ngo.id },
      data: {
        orgName: data.orgName ?? ngo.orgName,
        description: data.description ?? ngo.description,
        contactPhone: data.contactPhone ?? ngo.contactPhone,
        address: data.address ?? ngo.address,
        city: data.city ?? ngo.city,
        publicEmail: data.publicEmail !== undefined ? data.publicEmail : ngo.publicEmail,
        publicPhone: data.publicPhone !== undefined ? data.publicPhone : ngo.publicPhone,
        whatsappNumber: data.whatsappNumber !== undefined ? data.whatsappNumber : ngo.whatsappNumber,
        website: data.website !== undefined ? data.website : ngo.website,
        facebookUrl: data.facebookUrl !== undefined ? data.facebookUrl : ngo.facebookUrl,
        instagramUrl: data.instagramUrl !== undefined ? data.instagramUrl : ngo.instagramUrl,
        showFullAddress: data.showFullAddress !== undefined ? data.showFullAddress : ngo.showFullAddress,
        emergencyAvailable: data.emergencyAvailable !== undefined ? data.emergencyAvailable : ngo.emergencyAvailable,
        available24x7: data.available24x7 !== undefined ? data.available24x7 : ngo.available24x7,
        serviceAreaNote: data.serviceAreaNote !== undefined ? data.serviceAreaNote : ngo.serviceAreaNote
      },
      include: {
        user: true,
        category: true,
        documents: true,
        services: { include: { category: true } }
      }
    });
  });
};

// Public: urgent help finder with ranking and pagination
export const searchUrgentNgos = async (query = {}) => {
  const { category, city, state, emergency, page = 1, limit = 12 } = query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10) || 12));

  const where = {
    verificationStatus: 'APPROVED'
  };

  if (emergency === true || emergency === 'true') {
    where.emergencyAvailable = true;
  }

  if (category) {
    const categoryIds = Array.isArray(category)
      ? category
      : typeof category === 'string'
      ? category.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    if (categoryIds.length > 0) {
      where.OR = [
        { categoryId: { in: categoryIds } },
        { services: { some: { categoryId: { in: categoryIds } } } }
      ];
    }
  }

  // Fetch all matching APPROVED NGOs using Prisma
  const candidates = await prisma.ngoProfile.findMany({
    where,
    include: {
      category: true,
      services: { include: { category: true } }
    }
  });

  // State is a strict, case-insensitive filter
  let stateFiltered = candidates;
  if (state && state.trim()) {
    const targetState = state.trim().toLowerCase();
    stateFiltered = candidates.filter((ngo) => {
      const geo = resolveCityCoordinates(ngo.city);
      return (
        geo.state.toLowerCase() === targetState ||
        ngo.city.toLowerCase() === targetState
      );
    });
  }

  // City is a ranking preference only:
  // Same city first, then emergencyAvailable, then newest
  const targetCity = city && city.trim() ? city.trim().toLowerCase() : null;

  const rankedNgos = [...stateFiltered].sort((a, b) => {
    if (targetCity) {
      const aSameCity = a.city?.trim().toLowerCase() === targetCity;
      const bSameCity = b.city?.trim().toLowerCase() === targetCity;
      if (aSameCity && !bSameCity) return -1;
      if (!aSameCity && bSameCity) return 1;
    }

    if (a.emergencyAvailable !== b.emergencyAvailable) {
      return a.emergencyAvailable ? -1 : 1;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Paginate ranked list
  const total = rankedNgos.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;
  const pagedNgos = rankedNgos.slice(skip, skip + limitNum);

  return {
    data: pagedNgos,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
};

// NGO owner only: upload verification document
export const uploadNgoDocument = async (userId, file, { docType }) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { userId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found', 404);
  }

  // Rule: Uploading documents is allowed only while the NGO status is PENDING or REJECTED
  if (ngo.verificationStatus !== 'PENDING' && ngo.verificationStatus !== 'REJECTED') {
    throw new AppError(
      `Cannot upload documents while NGO verification status is ${ngo.verificationStatus}`,
      403
    );
  }

  if (!file || !file.buffer) {
    throw new AppError('File buffer is required for upload', 400);
  }

  // Validate magic byte signatures from the first bytes
  const verifiedMimeType = validateFileSignature(file.buffer, file.mimetype);

  // Save to private uploads storage
  const storageKey = await saveFile(file.buffer, file.originalname, verifiedMimeType);

  const document = await prisma.ngoDocument.create({
    data: {
      ngoProfileId: ngo.id,
      docType: docType || 'REGISTRATION_CERTIFICATE',
      originalName: file.originalname,
      storageKey,
      mimeType: verifiedMimeType,
      fileSize: file.size
    }
  });

  return document;
};

// NGO owner only: delete an uploaded document
export const deleteNgoDocument = async (userId, docId) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { userId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found', 404);
  }

  // Rule: Deleting documents is allowed only while status is PENDING or REJECTED
  if (ngo.verificationStatus !== 'PENDING' && ngo.verificationStatus !== 'REJECTED') {
    throw new AppError(
      `Cannot delete documents while NGO verification status is ${ngo.verificationStatus}`,
      403
    );
  }

  const document = await prisma.ngoDocument.findUnique({
    where: { id: docId }
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Ownership check: one NGO cannot delete another NGO's documents
  if (document.ngoProfileId !== ngo.id) {
    throw new AppError('Forbidden: Access denied to this document', 403);
  }

  // Remove from storage and database
  await deleteFile(document.storageKey);
  await prisma.ngoDocument.delete({ where: { id: docId } });

  return { message: 'Document deleted successfully' };
};

// NGO owner: list their own documents
export const listMyDocuments = async (userId) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { userId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found', 404);
  }

  return prisma.ngoDocument.findMany({
    where: { ngoProfileId: ngo.id },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
};

// NGO owner: resubmit for verification after rejection
export const resubmitVerification = async (userId) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { userId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found', 404);
  }

  // Rule: Resubmit is allowed only from REJECTED status
  if (ngo.verificationStatus !== 'REJECTED') {
    throw new AppError('Resubmission is only allowed for REJECTED NGOs', 400);
  }

  // Rule: Resubmit requires at least one document
  const docCount = await prisma.ngoDocument.count({
    where: { ngoProfileId: ngo.id }
  });

  if (docCount === 0) {
    throw new AppError('Cannot resubmit without at least one uploaded document', 400);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ngoProfile.update({
      where: { id: ngo.id },
      data: {
        verificationStatus: 'PENDING'
      },
      include: {
        user: true,
        category: true,
        documents: true,
        verificationReviews: {
          include: { reviewer: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Write review row for resubmission
    await tx.ngoVerificationReview.create({
      data: {
        ngoProfileId: ngo.id,
        reviewerId: userId,
        fromStatus: 'REJECTED',
        toStatus: 'PENDING',
        notes: 'Resubmitted by NGO'
      }
    });

    return updated;
  });
};

// Admin only: stream document for viewing
export const streamDocumentForAdmin = async (docId) => {
  const document = await prisma.ngoDocument.findUnique({
    where: { id: docId }
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  const fileData = getFile(document.storageKey);

  return {
    stream: fileData.stream,
    mimeType: document.mimeType,
    originalName: document.originalName,
    fileSize: document.fileSize
  };
};

// Admin only: list all documents for a specific NGO
export const listDocumentsForAdmin = async (ngoId) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { id: ngoId }
  });

  if (!ngo) {
    throw new AppError('NGO not found', 404);
  }

  return prisma.ngoDocument.findMany({
    where: { ngoProfileId: ngoId },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
};

// Admin only: list verification reviews for an NGO
export const listReviewsForAdmin = async (ngoId) => {
  return prisma.ngoVerificationReview.findMany({
    where: { ngoProfileId: ngoId },
    include: { reviewer: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
};
