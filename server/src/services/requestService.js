import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

// Create a resource request (Only APPROVED NGOs)
export const createRequest = async (user, data) => {
  if (user.role !== 'ngo') {
    throw new AppError('Forbidden: Only NGOs can create resource requests', 403);
  }

  const ngoProfile = await prisma.ngoProfile.findUnique({
    where: { userId: user.id }
  });

  if (!ngoProfile) {
    throw new AppError('NGO profile not found', 404);
  }

  // Verification rule: only APPROVED NGOs can post resource requests
  if (ngoProfile.verificationStatus !== 'APPROVED') {
    throw new AppError(
      `Forbidden: Cannot create requests while verification status is ${ngoProfile.verificationStatus}. Only APPROVED NGOs can create requests.`,
      403
    );
  }

  return prisma.resourceRequest.create({
    data: {
      ngoProfileId: ngoProfile.id,
      title: data.title,
      description: data.description,
      category: data.category,
      urgency: data.urgency || 'MEDIUM',
      quantityNeeded: data.quantityNeeded,
      unit: data.unit,
      location: data.location,
      status: 'OPEN'
    },
    include: { ngoProfile: true }
  });
};

// Public listing with filtering for category, urgency, status, and search keyword
export const listRequests = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  } else {
    // By default for visitors and public, show active requests
    where.status = { in: ['OPEN', 'PARTIAL'] };
  }

  if (filters.category) {
    where.category = { contains: filters.category, mode: 'insensitive' };
  }

  if (filters.urgency) {
    where.urgency = filters.urgency;
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  if (filters.ngoId) {
    where.ngoProfileId = filters.ngoId;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  return prisma.resourceRequest.findMany({
    where,
    include: {
      ngoProfile: true
    },
    orderBy: [
      { urgency: 'desc' },
      { createdAt: 'desc' }
    ]
  });
};

// Retrieve a single request by ID
export const getRequestById = async (id) => {
  const request = await prisma.resourceRequest.findUnique({
    where: { id },
    include: {
      ngoProfile: true,
      transfers: {
        include: { donor: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!request) {
    throw new AppError('Resource request not found', 404);
  }

  return request;
};

// Update request (role check + ownership check)
export const updateRequest = async (user, requestId, data) => {
  const existing = await prisma.resourceRequest.findUnique({
    where: { id: requestId },
    include: { ngoProfile: true }
  });

  if (!existing) {
    throw new AppError('Resource request not found', 404);
  }

  // Ownership check: must be the NGO that created the request, or admin
  const isOwner = existing.ngoProfile.userId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only modify your own resource requests', 403);
  }

  return prisma.resourceRequest.update({
    where: { id: requestId },
    data: {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      category: data.category ?? existing.category,
      urgency: data.urgency ?? existing.urgency,
      quantityNeeded: data.quantityNeeded ?? existing.quantityNeeded,
      unit: data.unit ?? existing.unit,
      location: data.location ?? existing.location,
      status: data.status ?? existing.status
    },
    include: { ngoProfile: true }
  });
};

// Delete/cancel request (role check + ownership check)
export const deleteRequest = async (user, requestId) => {
  const existing = await prisma.resourceRequest.findUnique({
    where: { id: requestId },
    include: { ngoProfile: true }
  });

  if (!existing) {
    throw new AppError('Resource request not found', 404);
  }

  const isOwner = existing.ngoProfile.userId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new AppError('Forbidden: You can only delete your own resource requests', 403);
  }

  return prisma.resourceRequest.delete({
    where: { id: requestId }
  });
};

// List requests belonging to current logged-in NGO
export const listMyNgoRequests = async (userId) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { userId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found', 404);
  }

  return prisma.resourceRequest.findMany({
    where: { ngoProfileId: ngo.id },
    include: {
      transfers: {
        include: { donor: true },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};
