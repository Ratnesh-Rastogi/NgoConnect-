import { resolveCityCoordinates } from '../utils/geo.js';

// Mappers to ensure sensitive documents, registration details, and private contacts are only returned to authorized roles

export const toPublicNgo = (ngo) => {
  if (!ngo) return null;
  const isApproved = ngo.verificationStatus === 'APPROVED';
  const geo = resolveCityCoordinates(ngo.city);

  const base = {
    id: ngo.id,
    orgName: ngo.orgName,
    categoryId: ngo.categoryId,
    category: ngo.category ? (typeof ngo.category === 'object' ? ngo.category.name : ngo.category) : undefined,
    description: ngo.description,
    city: ngo.city,
    state: geo.state !== 'Unknown' ? geo.state : undefined,
    verificationStatus: ngo.verificationStatus,
    createdAt: ngo.createdAt
  };

  // Only return public contact fields and emergency services for APPROVED NGOs
  if (!isApproved) {
    return base;
  }

  const services = ngo.services
    ? ngo.services.map((s) => ({
        id: s.category?.id || s.categoryId,
        name: s.category?.name || 'Service',
        slug: s.category?.slug
      }))
    : [];

  return {
    ...base,
    publicEmail: ngo.publicEmail || undefined,
    publicPhone: ngo.publicPhone || undefined,
    whatsappNumber: ngo.whatsappNumber || undefined,
    website: ngo.website || undefined,
    facebookUrl: ngo.facebookUrl || undefined,
    instagramUrl: ngo.instagramUrl || undefined,
    showFullAddress: Boolean(ngo.showFullAddress),
    address: ngo.showFullAddress ? ngo.address : undefined,
    emergencyAvailable: Boolean(ngo.emergencyAvailable),
    available24x7: Boolean(ngo.available24x7),
    serviceAreaNote: ngo.serviceAreaNote || undefined,
    services
  };
};

export const toPrivateNgo = (ngo) => {
  if (!ngo) return null;
  const geo = resolveCityCoordinates(ngo.city);
  const services = ngo.services
    ? ngo.services.map((s) => ({
        id: s.category?.id || s.categoryId,
        name: s.category?.name || 'Service',
        slug: s.category?.slug
      }))
    : [];

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
    state: geo.state !== 'Unknown' ? geo.state : undefined,
    publicEmail: ngo.publicEmail || null,
    publicPhone: ngo.publicPhone || null,
    whatsappNumber: ngo.whatsappNumber || null,
    website: ngo.website || null,
    facebookUrl: ngo.facebookUrl || null,
    instagramUrl: ngo.instagramUrl || null,
    showFullAddress: Boolean(ngo.showFullAddress),
    emergencyAvailable: Boolean(ngo.emergencyAvailable),
    available24x7: Boolean(ngo.available24x7),
    serviceAreaNote: ngo.serviceAreaNote || null,
    services,
    verificationStatus: ngo.verificationStatus,
    verificationNotes: ngo.verificationNotes,
    createdAt: ngo.createdAt,
    updatedAt: ngo.updatedAt,
    user: ngo.user
      ? {
          id: ngo.user.id,
          name: ngo.user.name,
          email: ngo.user.email
        }
      : undefined,
    documents: ngo.documents
      ? ngo.documents.map((d) => ({
          id: d.id,
          docType: d.docType,
          originalName: d.originalName,
          mimeType: d.mimeType,
          fileSize: d.fileSize,
          createdAt: d.createdAt
        }))
      : undefined,
    verificationReviews: ngo.verificationReviews
      ? ngo.verificationReviews.map((r) => ({
          id: r.id,
          fromStatus: r.fromStatus,
          toStatus: r.toStatus,
          notes: r.notes,
          reviewerName: r.reviewer?.name,
          createdAt: r.createdAt
        }))
      : undefined
  };
};
