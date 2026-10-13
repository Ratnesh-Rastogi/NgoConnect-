import { toSafeCategory } from './categoryMapper.js';
import { toSafeUser } from './userMapper.js';

// Safe public representation of a donor resource listing
export const toPublicResource = (resource) => {
  if (!resource) return null;
  return {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    quantityTotal: resource.quantityTotal,
    quantityAvailable: resource.quantityAvailable,
    unit: resource.unit,
    expiryDate: resource.expiryDate,
    city: resource.city,
    state: resource.state,
    latitude: resource.latitude,
    longitude: resource.longitude,
    status: resource.status,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
    category: resource.category ? toSafeCategory(resource.category) : undefined,
    owner: resource.owner ? toSafeUser(resource.owner) : undefined
  };
};
