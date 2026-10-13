import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

// Public listing: visitors can only see APPROVED NGOs
export const listApprovedNgos = async (filters = {}) => {
  const where = {
    verificationStatus: 'APPROVED'
  };

  if (filters.category) {
    where.category = { contains: filters.category, mode: 'insensitive' };
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

  return prisma.ngoProfile.findMany({
    where,
    orderBy: { orgName: 'asc' }
  });
};

// Retrieve single NGO profile
export const getNgoById = async (id) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { id },
    include: {
      user: true,
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
export const listAllNgosForAdmin = async (status) => {
  const where = {};
  if (status) {
    where.verificationStatus = status;
  }

  return prisma.ngoProfile.findMany({
    where,
    include: {
      user: true,
      _count: {
        select: { requests: true, transfersReceived: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Admin only: change verification status (APPROVED, REJECTED, SUSPENDED)
export const updateNgoStatus = async (ngoId, { verificationStatus, verificationNotes }) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { id: ngoId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found', 404);
  }

  return prisma.ngoProfile.update({
    where: { id: ngoId },
    data: {
      verificationStatus,
      verificationNotes: verificationNotes ?? ngo.verificationNotes
    },
    include: { user: true }
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

  // Ownership enforced: user can only modify their own NGO profile
  return prisma.ngoProfile.update({
    where: { id: ngo.id },
    data: {
      orgName: data.orgName ?? ngo.orgName,
      description: data.description ?? ngo.description,
      category: data.category ?? ngo.category,
      contactPhone: data.contactPhone ?? ngo.contactPhone,
      address: data.address ?? ngo.address,
      city: data.city ?? ngo.city,
      verificationDocUrl: data.verificationDocUrl ?? ngo.verificationDocUrl
    }
  });
};
