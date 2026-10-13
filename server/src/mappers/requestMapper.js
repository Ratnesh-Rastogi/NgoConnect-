import { toPublicNgo } from './ngoMapper.js';

// Mapper for resource requests including safe NGO summary
export const toPublicRequest = (req) => {
  if (!req) return null;
  return {
    id: req.id,
    title: req.title,
    description: req.description,
    category: req.category,
    urgency: req.urgency,
    quantityNeeded: req.quantityNeeded,
    quantityFulfilled: req.quantityFulfilled,
    quantityReserved: req.quantityReserved,
    unit: req.unit,
    location: req.location,
    status: req.status,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    ngo: req.ngoProfile ? toPublicNgo(req.ngoProfile) : undefined
  };
};
