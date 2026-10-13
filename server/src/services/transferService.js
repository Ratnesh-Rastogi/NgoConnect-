import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

// Donor pledges a transfer/donation toward an active NGO request
export const createTransfer = async (user, { requestId, quantity, donorNote }) => {
  if (user.role !== 'donor') {
    throw new AppError('Forbidden: Only donors can pledge transfers', 403);
  }

  // Use interactive transaction to guarantee atomic reservation and prevent race conditions
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

    // Create the transfer record
    const transfer = await tx.transfer.create({
      data: {
        donorId: user.id,
        ngoProfileId: request.ngoProfileId,
        requestId: request.id,
        quantity,
        status: 'PENDING',
        donorNote: donorNote || null
      },
      include: {
        donor: true,
        request: true,
        ngoProfile: true
      }
    });

    // Atomically reserve the quantity on the request
    const updatedReserved = request.quantityReserved + quantity;
    const isNowFullyAllocated = request.quantityFulfilled + updatedReserved >= request.quantityNeeded;

    await tx.resourceRequest.update({
      where: { id: request.id },
      data: {
        quantityReserved: updatedReserved,
        status: isNowFullyAllocated && request.quantityFulfilled > 0 ? 'PARTIAL' : request.status
      }
    });

    return transfer;
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
        donor: true
      }
    });

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    // Terminal state protection
    if (transfer.status === 'RECEIVED' || transfer.status === 'CANCELLED') {
      throw new AppError(`Cannot update a transfer that is already ${transfer.status}`, 400);
    }

    const isDonorOwner = transfer.donorId === user.id;
    const isNgoReceiver = transfer.ngoProfile.userId === user.id;
    const isAdmin = user.role === 'admin';

    // 1. Mark IN_TRANSIT (Only the donor who pledged it, or admin)
    if (newStatus === 'IN_TRANSIT') {
      if (!isDonorOwner && !isAdmin) {
        throw new AppError('Forbidden: Only the donating donor can mark a transfer IN_TRANSIT', 403);
      }
      return tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'IN_TRANSIT',
          trackingInfo: trackingInfo ?? transfer.trackingInfo
        },
        include: { donor: true, request: true, ngoProfile: true }
      });
    }

    // 2. Mark RECEIVED (Only the receiving NGO, or admin)
    if (newStatus === 'RECEIVED') {
      if (!isNgoReceiver && !isAdmin) {
        throw new AppError('Forbidden: Only the receiving NGO can confirm receipt of a transfer', 403);
      }

      // Decrement reserved and increment fulfilled
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

      return tx.transfer.update({
        where: { id: transferId },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date()
        },
        include: { donor: true, request: true, ngoProfile: true }
      });
    }

    // 3. Mark CANCELLED (Can be cancelled by donor, receiving NGO, or admin)
    if (newStatus === 'CANCELLED') {
      if (!isDonorOwner && !isNgoReceiver && !isAdmin) {
        throw new AppError('Forbidden: You do not have permission to cancel this transfer', 403);
      }

      // Release reserved quantity back to request
      const newReserved = Math.max(0, transfer.request.quantityReserved - transfer.quantity);
      const newStatus =
        transfer.request.quantityFulfilled >= transfer.request.quantityNeeded
          ? 'FULFILLED'
          : transfer.request.quantityFulfilled > 0
          ? 'PARTIAL'
          : 'OPEN';

      await tx.resourceRequest.update({
        where: { id: transfer.requestId },
        data: {
          quantityReserved: newReserved,
          status: newStatus
        }
      });

      return tx.transfer.update({
        where: { id: transferId },
        data: { status: 'CANCELLED' },
        include: { donor: true, request: true, ngoProfile: true }
      });
    }

    throw new AppError(`Invalid status transition to ${newStatus}`, 400);
  });
};

// List transfers pledged by the logged-in donor
export const listDonorTransfers = async (donorId) => {
  return prisma.transfer.findMany({
    where: { donorId },
    include: {
      request: true,
      ngoProfile: true,
      donor: true
    },
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
    include: {
      request: true,
      ngoProfile: true,
      donor: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

// Single transfer retrieval with ownership/role check
export const getTransferById = async (user, transferId) => {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: {
      request: true,
      ngoProfile: true,
      donor: true
    }
  });

  if (!transfer) {
    throw new AppError('Transfer not found', 404);
  }

  const isDonorOwner = transfer.donorId === user.id;
  const isNgoReceiver = transfer.ngoProfile.userId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isDonorOwner && !isNgoReceiver && !isAdmin) {
    throw new AppError('Forbidden: Access denied to this transfer record', 403);
  }

  return transfer;
};
