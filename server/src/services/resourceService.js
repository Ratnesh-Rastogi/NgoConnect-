import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { resolveCityCoordinates } from '../utils/geo.js';

// Create a new resource listing (Allowed for Donors and APPROVED NGOs)
export const createResource = async (user, data) => {
  const isDonor = user.role === 'donor';
  const isApprovedNgo = user.role === 'ngo' && user.ngoProfile?.verificationStatus === 'APPROVED';

  if (!isDonor && !isApprovedNgo) {
    throw new AppError(
      'Forbidden: Only donors and APPROVED NGOs can list resources',
      403
    );
  }

  // Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId }
  });
  if (!category) {
    throw new AppError('Invalid category ID', 400);
  }

  // Validate expiry date is not in the past
  if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
    throw new AppError('Expiry date cannot be in the past', 400);
  }

  const geo = resolveCityCoordinates(data.city, data.state, data.latitude, data.longitude);

  return prisma.resource.create({
    data: {
      ownerId: user.id,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      quantityTotal: data.quantityTotal,
      quantityAvailable: data.quantityTotal,
      unit: data.unit,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      city: geo.city,
      state: geo.state,
      latitude: geo.latitude,
      longitude: geo.longitude,
      status: 'ACTIVE'
    },
    include: {
      category: true,
      owner: true
    }
  });
};

// Public listing with filtering by category, city, and status
export const listResources = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  } else {
    // Default to active resources for public browsing
    where.status = 'ACTIVE';
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  return prisma.resource.findMany({
    where,
    include: {
      category: true,
      owner: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Retrieve single resource by ID
export const getResourceById = async (id) => {
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      category: true,
      owner: true,
      transfers: {
        include: { ngoProfile: true }
      }
    }
  });

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  return resource;
};

// Update resource (Owner or Admin only)
export const updateResource = async (user, resourceId, data) => {
  const existing = await prisma.resource.findUnique({
    where: { id: resourceId }
  });

  if (!existing) {
    throw new AppError('Resource not found', 404);
  }

  const isOwner = existing.ownerId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only edit your own resource listings', 403);
  }

  if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
    throw new AppError('Expiry date cannot be in the past', 400);
  }

  const updatePayload = { ...data };

  if (data.city) {
    const geo = resolveCityCoordinates(data.city, data.state, data.latitude, data.longitude);
    updatePayload.city = geo.city;
    updatePayload.state = geo.state;
    updatePayload.latitude = geo.latitude;
    updatePayload.longitude = geo.longitude;
  }

  if (data.expiryDate) {
    updatePayload.expiryDate = new Date(data.expiryDate);
  }

  return prisma.resource.update({
    where: { id: resourceId },
    data: updatePayload,
    include: { category: true, owner: true }
  });
};

// Withdraw resource listing (Status change, not delete)
export const withdrawResource = async (user, resourceId) => {
  const existing = await prisma.resource.findUnique({
    where: { id: resourceId }
  });

  if (!existing) {
    throw new AppError('Resource not found', 404);
  }

  const isOwner = existing.ownerId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only withdraw your own resource listings', 403);
  }

  return prisma.resource.update({
    where: { id: resourceId },
    data: { status: 'WITHDRAWN' },
    include: { category: true, owner: true }
  });
};

// APPROVED NGO claims a quantity from an active resource
export const claimResource = async (user, resourceId, { quantity, claimNote }) => {
  // 1. Role verification
  if (user.role !== 'ngo') {
    throw new AppError('Forbidden: Only NGOs can claim resources', 403);
  }
  if (!user.ngoProfile || user.ngoProfile.verificationStatus !== 'APPROVED') {
    throw new AppError('Forbidden: Only APPROVED NGOs can claim resources', 403);
  }

  // 2. Fetch target resource for ownership and expiry checks
  const target = await prisma.resource.findUnique({
    where: { id: resourceId }
  });

  if (!target) {
    throw new AppError('Resource not found', 404);
  }

  // 3. Block NGO from claiming a resource it owns
  if (target.ownerId === user.id) {
    throw new AppError('Forbidden: An NGO cannot claim a resource it owns', 403);
  }

  if (target.status !== 'ACTIVE') {
    throw new AppError(`Cannot claim a resource with status ${target.status}`, 400);
  }

  if (target.expiryDate && new Date(target.expiryDate) < new Date()) {
    throw new AppError('Cannot claim an expired resource', 400);
  }

  // 4. Single conditional update inside transaction to guarantee concurrency safety
  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.resource.updateMany({
      where: {
        id: resourceId,
        status: 'ACTIVE',
        quantityAvailable: { gte: quantity }
      },
      data: {
        quantityAvailable: { decrement: quantity }
      }
    });

    if (updateResult.count === 0) {
      throw new AppError('Insufficient available quantity or resource is no longer active', 400);
    }

    // Check if fully exhausted
    const updated = await tx.resource.findUnique({
      where: { id: resourceId }
    });

    if (updated.quantityAvailable === 0) {
      await tx.resource.update({
        where: { id: resourceId },
        data: { status: 'EXHAUSTED' }
      });
    }

    // Create the transfer record representing the claim
    const transfer = await tx.transfer.create({
      data: {
        donorId: target.ownerId,
        ngoProfileId: user.ngoProfile.id,
        resourceId: target.id,
        quantity,
        status: 'PENDING',
        donorNote: claimNote || null
      }
    });

    // Write initial TransferEvent inside same transaction
    await tx.transferEvent.create({
      data: {
        transferId: transfer.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedById: user.id,
        note: claimNote ? `Claimed: ${claimNote}` : 'Resource claimed by NGO'
      }
    });

    // Write notifications inside same transaction
    // 1. Notify the resource owner
    await tx.notification.create({
      data: {
        userId: target.ownerId,
        type: 'RESOURCE_CLAIMED',
        title: 'Resource Listing Claimed',
        message: `${user.ngoProfile.orgName} claimed ${quantity} ${target.unit} of your listing "${target.title}".`
      }
    });

    // 2. Notify the claiming NGO user
    await tx.notification.create({
      data: {
        userId: user.id,
        type: 'CLAIM_RECORDED',
        title: 'Resource Claim Recorded',
        message: `You claimed ${quantity} ${target.unit} from "${target.title}".`
      }
    });

    return tx.transfer.findUnique({
      where: { id: transfer.id },
      include: {
        donor: true,
        ngoProfile: true,
        resource: { include: { category: true } },
        events: {
          include: {
            changedBy: { select: { id: true, name: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  });
};

// Retrieve listings created by the authenticated user
export const listMyResources = async (userId) => {
  return prisma.resource.findMany({
    where: { ownerId: userId },
    include: {
      category: true,
      transfers: {
        include: { ngoProfile: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};
