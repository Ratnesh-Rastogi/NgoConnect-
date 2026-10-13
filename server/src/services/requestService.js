import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';
import { resolveCityCoordinates } from '../utils/geo.js';

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

  // Resolve category ID from categoryId or category string
  let categoryId = data.categoryId;
  if (!categoryId && data.category) {
    let matchedCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { id: data.category },
          { slug: data.category.toLowerCase().replace(/\s+/g, '-') },
          { name: { equals: data.category, mode: 'insensitive' } }
        ]
      }
    });

    if (!matchedCategory) {
      const catLower = data.category.toLowerCase();
      if (catLower.includes('food')) {
        matchedCategory = await prisma.category.findFirst({ where: { slug: 'food-distribution' } });
      } else if (catLower.includes('med') || catLower.includes('health')) {
        matchedCategory = await prisma.category.findFirst({ where: { slug: 'healthcare' } });
      } else if (catLower.includes('edu')) {
        matchedCategory = await prisma.category.findFirst({ where: { slug: 'education' } });
      } else if (catLower.includes('env')) {
        matchedCategory = await prisma.category.findFirst({ where: { slug: 'environmental-protection' } });
      } else if (catLower.includes('cloth')) {
        matchedCategory = await prisma.category.findFirst({ where: { slug: 'clothing' } });
      } else if (catLower.includes('shelt')) {
        matchedCategory = await prisma.category.findFirst({ where: { slug: 'shelter' } });
      } else {
        matchedCategory = await prisma.category.findFirst({
          where: {
            OR: [
              { name: { contains: data.category, mode: 'insensitive' } },
              { slug: { contains: data.category, mode: 'insensitive' } }
            ]
          }
        });
      }
    }

    if (matchedCategory) {
      categoryId = matchedCategory.id;
    }
  }

  if (!categoryId) {
    throw new AppError('Invalid category ID or name', 400);
  }

  const cityName = data.city || data.location || ngoProfile.city || 'New Delhi';
  const geo = resolveCityCoordinates(cityName, data.state, data.latitude, data.longitude);

  return prisma.resourceRequest.create({
    data: {
      ngoProfileId: ngoProfile.id,
      title: data.title,
      description: data.description,
      categoryId,
      urgency: data.urgency || 'MEDIUM',
      quantityNeeded: data.quantityNeeded,
      unit: data.unit,
      city: geo.city,
      state: geo.state,
      latitude: geo.latitude,
      longitude: geo.longitude,
      status: 'OPEN'
    },
    include: {
      ngoProfile: true,
      category: true
    }
  });
};

// Public listing with filtering for category, urgency, status, city, and search keyword
export const listRequests = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  } else {
    // By default for visitors and public, show active requests
    where.status = { in: ['OPEN', 'PARTIAL'] };
  }

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

  if (filters.urgency) {
    where.urgency = filters.urgency;
  }

  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  } else if (filters.location) {
    where.OR = [
      { city: { contains: filters.location, mode: 'insensitive' } },
      { state: { contains: filters.location, mode: 'insensitive' } }
    ];
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

  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit || filters.take, 10) || 50, 1), 100);
  const skip = filters.skip ? Math.max(parseInt(filters.skip, 10) || 0, 0) : (page - 1) * limit;

  return prisma.resourceRequest.findMany({
    where,
    include: {
      ngoProfile: true,
      category: true
    },
    orderBy: [
      { urgency: 'desc' },
      { createdAt: 'desc' }
    ],
    take: limit,
    skip
  });
};

// Retrieve a single request by ID
export const getRequestById = async (id) => {
  const request = await prisma.resourceRequest.findUnique({
    where: { id },
    include: {
      ngoProfile: true,
      category: true,
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

  let categoryId = existing.categoryId;
  if (data.categoryId) {
    categoryId = data.categoryId;
  } else if (data.category) {
    const matchedCategory = await prisma.category.findFirst({
      where: {
        OR: [
          { id: data.category },
          { slug: data.category.toLowerCase().replace(/\s+/g, '-') },
          { name: { equals: data.category, mode: 'insensitive' } }
        ]
      }
    });
    if (matchedCategory) {
      categoryId = matchedCategory.id;
    }
  }

  let geo = {
    city: existing.city,
    state: existing.state,
    latitude: existing.latitude,
    longitude: existing.longitude
  };

  if (data.city || data.location) {
    geo = resolveCityCoordinates(
      data.city || data.location,
      data.state,
      data.latitude,
      data.longitude
    );
  }

  return prisma.resourceRequest.update({
    where: { id: requestId },
    data: {
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      categoryId,
      urgency: data.urgency ?? existing.urgency,
      quantityNeeded: data.quantityNeeded ?? existing.quantityNeeded,
      unit: data.unit ?? existing.unit,
      city: geo.city,
      state: geo.state,
      latitude: geo.latitude,
      longitude: geo.longitude,
      status: data.status ?? existing.status
    },
    include: {
      ngoProfile: true,
      category: true
    }
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
      category: true,
      transfers: {
        include: { donor: true },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
};
