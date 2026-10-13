import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

const transferInclude = {
  request: true,
  ngoProfile: true,
  donor: true,
  resource: true,
  events: {
    include: {
      changedBy: {
        select: { id: true, name: true, role: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  }
};

// Donor creates a transfer/donation toward an active NGO request
export const createTransfer = async (user, { requestId, quantity, donorNote }) => {
  if (user.role !== 'donor') {
    throw new AppError('Forbidden: Only donors can make donations', 403);
  }

  // Use interactive transaction to guarantee atomic reservation, event log, and notification
  return prisma.$transaction(async (tx) => {
    const request = await tx.resourceRequest.findUnique({
      where: { id: requestId },
      include: { ngoProfile: true }
    });

    if (!request) {
      throw new AppError('Resource request not found', 404);
    }

    // Status check
    if (request.status === 'FULFILLED' || request.status === 'CANCELLED') {
      throw new AppError(`Cannot donate to a request that is ${request.status}`, 400);
    }

    // Only APPROVED NGOs can receive transfers
    if (request.ngoProfile.verificationStatus !== 'APPROVED') {
      throw new AppError(
        `Cannot transfer resources to an NGO with status ${request.ngoProfile.verificationStatus}`,
        403
      );
    }

    // Reservation check: ensure quantity does not exceed remaining needed
    const remainingNeeded = request.quantityNeeded - request.quantityFulfilled - request.quantityReserved;
    if (quantity > remainingNeeded) {
      throw new AppError(
        `Quantity (${quantity}) exceeds remaining unreserved quantity (${remainingNeeded})`,
        400
      );
    }

    // 1. Create the transfer record
    const transfer = await tx.transfer.create({
      data: {
        donorId: user.id,
        ngoProfileId: request.ngoProfileId,
        requestId: request.id,
        quantity,
        status: 'PENDING',
        donorNote: donorNote || null
      }
    });

    // 2. Write initial TransferEvent inside same transaction
    await tx.transferEvent.create({
      data: {
        transferId: transfer.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedById: user.id,
        note: donorNote ? `Donation: ${donorNote}` : 'Donation created by donor'
      }
    });

    // 3. Create notifications inside same transaction
    // Notify the receiving NGO
    await tx.notification.create({
      data: {
        userId: request.ngoProfile.userId,
        type: 'NEW_DONATION',
        title: 'New Resource Donation',
        message: `${user.name} donated ${quantity} ${request.unit} to your request "${request.title}".`
      }
    });

    // Notify the donating donor
    await tx.notification.create({
      data: {
        userId: user.id,
        type: 'DONATION_RECORDED',
        title: 'Donation Recorded',
        message: `You donated ${quantity} ${request.unit} to "${request.title}" (${request.ngoProfile.orgName}).`
      }
    });

    // 4. Atomically reserve the quantity on the request
    const updatedReserved = request.quantityReserved + quantity;
    const isNowFullyAllocated = request.quantityFulfilled + updatedReserved >= request.quantityNeeded;

    await tx.resourceRequest.update({
      where: { id: request.id },
      data: {
        quantityReserved: updatedReserved,
        status: isNowFullyAllocated && request.quantityFulfilled > 0 ? 'PARTIAL' : request.status
      }
    });

    return tx.transfer.findUnique({
      where: { id: transfer.id },
      include: transferInclude
    });
  });
};

// Transition transfer lifecycle: PENDING -> IN_TRANSIT -> RECEIVED / CANCELLED
export const updateTransferStatus = async (user, transferId, { status: newStatus, trackingInfo }) => {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { id: transferId },
      include: {
        request: true,
        ngoProfile: true,
        donor: true,
        resource: true
      }
    });

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    // Terminal state protection
    if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
      throw new AppError(`Cannot update a transfer that is already ${transfer.status}`, 400);
    }

    const isDonorOwner = transfer.donorId === user.id || (transfer.resource && transfer.resource.ownerId === user.id);
    const isNgoReceiver = transfer.ngoProfile.userId === user.id;
    const isAdmin = user.role === 'admin';
    const itemTitle = transfer.request?.title || transfer.resource?.title || 'Resource Transfer';

    // 1. Mark IN_TRANSIT (Only the donating donor, resource owner, or admin)
    if (newStatus === 'IN_TRANSIT') {
      if (!isDonorOwner && !isAdmin) {
        throw new AppError('Forbidden: Only the donating donor or resource owner can mark a transfer IN_TRANSIT', 403);
      }

      await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'IN_TRANSIT',
          trackingInfo: trackingInfo ?? transfer.trackingInfo
        }
      });

      // Write TransferEvent
      await tx.transferEvent.create({
        data: {
          transferId,
          fromStatus: transfer.status,
          toStatus: 'IN_TRANSIT',
          changedById: user.id,
          note: trackingInfo ? `Dispatched with tracking: ${trackingInfo}` : 'Marked in-transit'
        }
      });

      // Notify the receiving NGO
      await tx.notification.create({
        data: {
          userId: transfer.ngoProfile.userId,
          type: 'TRANSFER_IN_TRANSIT',
          title: 'Donation Dispatched & In-Transit',
          message: `A transfer of ${transfer.quantity} units for "${itemTitle}" has been dispatched.${trackingInfo ? ` Tracking: ${trackingInfo}` : ''}`
        }
      });

      return tx.transfer.findUnique({
        where: { id: transferId },
        include: transferInclude
      });
    }

    // 2. Mark RECEIVED (Only the receiving NGO, or admin)
    if (newStatus === 'RECEIVED') {
      if (!isNgoReceiver && !isAdmin) {
        throw new AppError('Forbidden: Only the receiving NGO can confirm receipt of a transfer', 403);
      }

      // Decrement reserved and increment fulfilled ONLY if requestId exists
      if (transfer.requestId && transfer.request) {
        const newFulfilled = transfer.request.quantityFulfilled + transfer.quantity;
        const newReserved = Math.max(0, transfer.request.quantityReserved - transfer.quantity);
        const isFulfilled = newFulfilled >= transfer.request.quantityNeeded;

        await tx.resourceRequest.update({
          where: { id: transfer.requestId },
          data: {
            quantityFulfilled: newFulfilled,
            quantityReserved: newReserved,
            status: isFulfilled ? 'FULFILLED' : 'PARTIAL'
          }
        });
      }

      await tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date()
        }
      });

      // Write TransferEvent
      await tx.transferEvent.create({
        data: {
          transferId,
          fromStatus: transfer.status,
          toStatus: 'RECEIVED',
          changedById: user.id,
          note: 'Confirmed received and verified by NGO'
        }
      });

      // Notify donating donor / owner
      await tx.notification.create({
        data: {
          userId: transfer.donorId,
          type: 'TRANSFER_RECEIVED',
          title: 'Donation Delivered & Verified',
          message: `${transfer.ngoProfile.orgName} confirmed receipt of ${transfer.quantity} units for "${itemTitle}".`
        }
      });

      return tx.transfer.findUnique({
        where: { id: transferId },
        include: transferInclude
      });
    }

    // 3. Mark CANCELLED (Can be cancelled by donor/owner, receiving NGO, or admin)
    if (newStatus === 'CANCELLED') {
      if (!isDonorOwner && !isNgoReceiver && !isAdmin) {
        throw new AppError('Forbidden: You do not have permission to cancel this transfer', 403);
      }

      // If linked to a request, release reserved quantity back to request
      if (transfer.requestId && transfer.request) {
        const newReserved = Math.max(0, transfer.request.quantityReserved - transfer.quantity);
        const newRequestStatus =
          transfer.request.quantityFulfilled >= transfer.request.quantityNeeded
            ? 'FULFILLED'
            : transfer.request.quantityFulfilled > 0
            ? 'PARTIAL'
            : 'OPEN';

        await tx.resourceRequest.update({
          where: { id: transfer.requestId },
          data: {
            quantityReserved: newReserved,
            status: newRequestStatus
          }
        });
      }

      // If linked to a resource:
      if (transfer.resourceId) {
        const currentResource = await tx.resource.findUnique({
          where: { id: transfer.resourceId }
        });

        if (currentResource) {
          const newQtyAvailable = currentResource.quantityAvailable + transfer.quantity;
          const isExpired = currentResource.expiryDate && new Date(currentResource.expiryDate) < new Date();
          const shouldReactivate =
            currentResource.status === 'EXHAUSTED' &&
            !isExpired &&
            currentResource.status !== 'WITHDRAWN';

          await tx.resource.update({
            where: { id: transfer.resourceId },
            data: {
              quantityAvailable: newQtyAvailable,
              ...(shouldReactivate ? { status: 'ACTIVE' } : {})
            }
          });
        }
      }

      await tx.transfer.update({
        where: { id: transferId },
        data: { status: 'CANCELLED' }
      });

      // Write TransferEvent
      await tx.transferEvent.create({
        data: {
          transferId,
          fromStatus: transfer.status,
          toStatus: 'CANCELLED',
          changedById: user.id,
          note: `Cancelled by ${user.role} (${user.name})`
        }
      });

      // Notify the counterparty (the party who did not cancel)
      if (isDonorOwner && !isNgoReceiver) {
        // Cancelled by donor/owner -> notify NGO
        await tx.notification.create({
          data: {
            userId: transfer.ngoProfile.userId,
            type: 'TRANSFER_CANCELLED',
            title: 'Transfer Cancelled',
            message: `The transfer of ${transfer.quantity} units for "${itemTitle}" was cancelled by the donor.`
          }
        });
      } else if (isNgoReceiver && !isDonorOwner) {
        // Cancelled by NGO -> notify donor
        await tx.notification.create({
          data: {
            userId: transfer.donorId,
            type: 'TRANSFER_CANCELLED',
            title: 'Transfer Cancelled',
            message: `${transfer.ngoProfile.orgName} cancelled the transfer of ${transfer.quantity} units for "${itemTitle}".`
          }
        });
      } else if (isAdmin) {
        // Cancelled by admin -> notify both
        await tx.notification.createMany({
          data: [
            {
              userId: transfer.ngoProfile.userId,
              type: 'TRANSFER_CANCELLED',
              title: 'Transfer Cancelled by Admin',
              message: `The transfer of ${transfer.quantity} units for "${itemTitle}" was cancelled by platform administrator.`
            },
            {
              userId: transfer.donorId,
              type: 'TRANSFER_CANCELLED',
              title: 'Transfer Cancelled by Admin',
              message: `The transfer of ${transfer.quantity} units for "${itemTitle}" was cancelled by platform administrator.`
            }
          ]
        });
      }

      return tx.transfer.findUnique({
        where: { id: transferId },
        include: transferInclude
      });
    }

    throw new AppError(`Invalid status transition to ${newStatus}`, 400);
  });
};

// List transfers created by the logged-in donor
export const listDonorTransfers = async (donorId) => {
  return prisma.transfer.findMany({
    where: { donorId },
    include: transferInclude,
    orderBy: { createdAt: 'desc' }
  });
};

// List transfers received by the logged-in NGO
export const listNgoTransfers = async (userId) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { userId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found', 404);
  }

  return prisma.transfer.findMany({
    where: { ngoProfileId: ngo.id },
    include: transferInclude,
    orderBy: { createdAt: 'desc' }
  });
};

// Single transfer retrieval with ownership/role check
export const getTransferById = async (user, transferId) => {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: transferInclude
  });

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  const isDonorOwner = transfer.donorId === user.id || (transfer.resource && transfer.resource.ownerId === user.id);
  const isNgoReceiver = transfer.ngoProfile.userId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isDonorOwner && !isNgoReceiver && !isAdmin) {
    throw new AppError('Forbidden: Access denied to this transfer record', 403);
  }

  return transfer;
};
