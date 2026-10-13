import { toPublicNgo } from './ngoMapper.js';
import { toSafeCategory } from './categoryMapper.js';

// Mapper for resource requests including safe NGO summary
export const toPublicRequest = (req) => {
  if (!req) return null;
  return {
    id: req.id,
    title: req.title,
    description: req.description,
    categoryId: req.categoryId,
    category: req.category ? (typeof req.category === 'object' ? req.category.name : req.category) : undefined,
    categoryDetails: req.category && typeof req.category === 'object' ? toSafeCategory(req.category) : undefined,
    urgency: req.urgency,
    quantityNeeded: req.quantityNeeded,
    quantityFulfilled: req.quantityFulfilled,
    quantityReserved: req.quantityReserved,
    unit: req.unit,
    city: req.city,
    state: req.state,
    latitude: req.latitude,
    longitude: req.longitude,
    location: req.city ? `${req.city}, ${req.state}` : req.location,
    status: req.status,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    ngo: req.ngoProfile ? toPublicNgo(req.ngoProfile) : undefined
  };
};
