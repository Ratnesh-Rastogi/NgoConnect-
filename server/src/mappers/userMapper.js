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
          city: user.ngoProfile.city
        }
      : null
  };
};
