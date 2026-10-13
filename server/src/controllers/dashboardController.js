import * as dashboardService from '../services/dashboardService.js';

// GET /api/dashboard/ngo
export const getNgoStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getNgoDashboardStats(req.user.id);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/donor
export const getDonorStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getDonorDashboardStats(req.user.id);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

// GET /api/dashboard/admin
export const getAdminStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getAdminDashboardStats();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
