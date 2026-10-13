import { toPublicNgo } from './ngoMapper.js';
import { toPublicRequest } from './requestMapper.js';
import { toSafeUser } from './userMapper.js';

// Safe representation of a donation transfer / pledge
export const toSafeTransfer = (transfer) => {
  if (!transfer) return null;
  return {
    id: transfer.id,
    quantity: transfer.quantity,
    status: transfer.status,
    donorNote: transfer.donorNote,
    trackingInfo: transfer.trackingInfo,
    receivedAt: transfer.receivedAt,
    createdAt: transfer.createdAt,
    updatedAt: transfer.updatedAt,
    donor: transfer.donor ? toSafeUser(transfer.donor) : undefined,
    request: transfer.request ? toPublicRequest(transfer.request) : undefined,
    ngo: transfer.ngoProfile ? toPublicNgo(transfer.ngoProfile) : undefined
  };
};
