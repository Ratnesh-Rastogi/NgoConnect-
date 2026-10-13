import { prisma } from '../config/prisma.js';

// Retrieve all categories
export const listCategories = async () => {
  return prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
};

// Find category by ID or unique slug
export const getCategoryByIdOrSlug = async (identifier) => {
  return prisma.category.findFirst({
    where: {
      OR: [{ id: identifier }, { slug: identifier }]
    }
  });
};
