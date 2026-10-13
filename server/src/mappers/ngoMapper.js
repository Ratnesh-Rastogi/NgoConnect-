// Mappers to ensure sensitive documents, registration details, and private contacts are only returned to authorized roles

export const toPublicNgo = (ngo) => {
  if (!ngo) return null;
  return {
    id: ngo.id,
    orgName: ngo.orgName,
    categoryId: ngo.categoryId,
    category: ngo.category ? (typeof ngo.category === 'object' ? ngo.category.name : ngo.category) : undefined,
    description: ngo.description,
    city: ngo.city,
    verificationStatus: ngo.verificationStatus,
    createdAt: ngo.createdAt
  };
};

export const toPrivateNgo = (ngo) => {
  if (!ngo) return null;
  return {
    id: ngo.id,
    userId: ngo.userId,
    orgName: ngo.orgName,
    regNumber: ngo.regNumber,
    description: ngo.description,
    categoryId: ngo.categoryId,
    category: ngo.category ? (typeof ngo.category === 'object' ? ngo.category.name : ngo.category) : undefined,
    contactPhone: ngo.contactPhone,
    address: ngo.address,
    city: ngo.city,
    verificationStatus: ngo.verificationStatus,
    verificationNotes: ngo.verificationNotes,
    verificationDocUrl: ngo.verificationDocUrl,
    createdAt: ngo.createdAt,
    updatedAt: ngo.updatedAt,
    user: ngo.user
      ? {
          id: ngo.user.id,
          name: ngo.user.name,
          email: ngo.user.email
        }
      : undefined
  };
};
