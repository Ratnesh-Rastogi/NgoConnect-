import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

// Aggregate stats scoped to the authenticated NGO
export const getNgoDashboardStats = async (userId) => {
  const ngo = await prisma.ngoProfile.findUnique({
    where: { userId }
  });

  if (!ngo) {
    throw new AppError('NGO profile not found for current user', 404);
  }

  const [requests, transfers] = await Promise.all([
    prisma.resourceRequest.findMany({
      where: { ngoProfileId: ngo.id },
      select: {
        id: true,
        status: true,
        quantityNeeded: true,
        quantityFulfilled: true
      }
    }),
    prisma.transfer.findMany({
      where: { ngoProfileId: ngo.id },
      select: {
        id: true,
        status: true,
        quantity: true
      }
    })
  ]);

  const openRequestsCount = requests.filter(
    (r) => r.status === 'OPEN' || r.status === 'PARTIAL'
  ).length;
  const fulfilledRequestsCount = requests.filter((r) => r.status === 'FULFILLED').length;
  const totalRequestsCount = requests.length;

  const totalNeeded = requests.reduce((sum, r) => sum + r.quantityNeeded, 0);
  const totalFulfilled = requests.reduce((sum, r) => sum + r.quantityFulfilled, 0);
  const fulfilmentRate = totalNeeded > 0 ? Math.round((totalFulfilled / totalNeeded) * 100) : 0;

  const transfersByStatus = {
    PENDING: transfers.filter((t) => t.status === 'PENDING').length,
    IN_TRANSIT: transfers.filter((t) => t.status === 'IN_TRANSIT').length,
    RECEIVED: transfers.filter((t) => t.status === 'RECEIVED').length,
    CANCELLED: transfers.filter((t) => t.status === 'CANCELLED').length
  };

  return {
    ngoProfile: {
      id: ngo.id,
      orgName: ngo.orgName,
      verificationStatus: ngo.verificationStatus
    },
    openRequestsCount,
    totalRequestsCount,
    fulfilledRequestsCount,
    fulfilmentRate,
    transfersByStatus,
    totalTransfersCount: transfers.length
  };
};

// Aggregate stats scoped to the authenticated donor
export const getDonorDashboardStats = async (userId) => {
  const [transfers, myResourcesCount] = await Promise.all([
    prisma.transfer.findMany({
      where: { donorId: userId },
      select: {
        id: true,
        status: true,
        quantity: true
      }
    }),
    prisma.resource.count({
      where: { ownerId: userId }
    })
  ]);

  const myDonationsCount = transfers.length;
  const completedDeliveries = transfers.filter((t) => t.status === 'RECEIVED').length;
  const inTransitCount = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
  const pendingCount = transfers.filter((t) => t.status === 'PENDING').length;
  const cancelledCount = transfers.filter((t) => t.status === 'CANCELLED').length;
  const totalQuantityDonated = transfers
    .filter((t) => t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + t.quantity, 0);

  return {
    myDonationsCount,
    totalQuantityDonated,
    completedDeliveries,
    inTransitCount,
    pendingCount,
    cancelledCount,
    myResourcesCount
  };
};

// Aggregate platform totals, pending queue count, and transfers over time for Admin
export const getAdminDashboardStats = async () => {
  const [
    pendingNgosCount,
    totalUsers,
    totalDonors,
    totalNgos,
    approvedNgos,
    totalRequests,
    totalResources,
    allTransfers
  ] = await Promise.all([
    prisma.ngoProfile.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'donor' } }),
    prisma.ngoProfile.count(),
    prisma.ngoProfile.count({ where: { verificationStatus: 'APPROVED' } }),
    prisma.resourceRequest.count(),
    prisma.resource.count(),
    prisma.transfer.findMany({
      select: {
        id: true,
        quantity: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  const completedTransfers = allTransfers.filter((t) => t.status === 'RECEIVED').length;
  const totalQuantityTransferred = allTransfers
    .filter((t) => t.status === 'RECEIVED')
    .reduce((sum, t) => sum + t.quantity, 0);

  // Group transfers over time by day/date for Recharts visualization
  const groupedMap = new Map();

  allTransfers.forEach((t) => {
    const d = new Date(t.createdAt);
    const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (!groupedMap.has(dateKey)) {
      groupedMap.set(dateKey, {
        date: dateKey,
        transfers: 0,
        completed: 0,
        quantity: 0
      });
    }

    const entry = groupedMap.get(dateKey);
    entry.transfers += 1;
    if (t.status === 'RECEIVED') {
      entry.completed += 1;
      entry.quantity += t.quantity;
    }
  });

  let transfersOverTime = Array.from(groupedMap.values());

  // Provide fallback baseline points if newly seeded or empty
  if (transfersOverTime.length === 0) {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    transfersOverTime = [{ date: today, transfers: 0, completed: 0, quantity: 0 }];
  }

  return {
    pendingNgosCount,
    platformTotals: {
      totalUsers,
      totalDonors,
      totalNgos,
      approvedNgos,
      totalRequests,
      totalResources,
      totalTransfers: allTransfers.length,
      completedTransfers,
      totalQuantityTransferred
    },
    transfersOverTime
  };
};
