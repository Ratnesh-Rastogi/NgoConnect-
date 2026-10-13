// Pure functions to pick safe user fields and prevent accidental exposure of password hash or private data

export const toSafeUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt
  };
};

export const toAuthUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ngoProfile: user.ngoProfile
      ? {
          id: user.ngoProfile.id,
          orgName: user.ngoProfile.orgName,
          category: user.ngoProfile.category,
          verificationStatus: user.ngoProfile.verificationStatus,
          verificationNotes: user.ngoProfile.verificationNotes,
          description: user.ngoProfile.description,
          contactPhone: user.ngoProfile.contactPhone,
          address: user.ngoProfile.address,
          city: user.ngoProfile.city,
          publicEmail: user.ngoProfile.publicEmail,
          publicPhone: user.ngoProfile.publicPhone,
          whatsappNumber: user.ngoProfile.whatsappNumber,
          website: user.ngoProfile.website,
          facebookUrl: user.ngoProfile.facebookUrl,
          instagramUrl: user.ngoProfile.instagramUrl,
          showFullAddress: user.ngoProfile.showFullAddress
        }
      : null
  };
};
