import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

// Helper to extract JWT token from httpOnly cookie or Authorization Bearer header
const extractToken = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

// Verify JWT and attach full user context (including NGO profile if applicable)
export const authenticateUser = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError('Unauthorized: Missing or invalid authentication token', 401);
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { ngoProfile: true }
    });

    if (!user) {
      throw new AppError('Unauthorized: User no longer exists', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Optional auth for public routes where logged-in state enables extra personal data
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { ngoProfile: true }
    });

    req.user = user || null;
    next();
  } catch {
    // If token is invalid on an optional route, continue as guest/visitor
    req.user = null;
    next();
  }
};

// Check if authenticated user matches one of the allowed roles
export const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Unauthorized: Authentication required', 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(`Forbidden: Access requires role [${allowedRoles.join(', ')}]`, 403));
    }
    next();
  };
};

// Ensure that an NGO is verified and approved before creating requests or accepting transfers
export const requireApprovedNgo = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Unauthorized: Authentication required', 401));
  }
  if (req.user.role !== 'ngo') {
    return next(new AppError('Forbidden: Only NGOs can perform this action', 403));
  }
  if (!req.user.ngoProfile) {
    return next(new AppError('Forbidden: NGO profile not found', 403));
  }
  if (req.user.ngoProfile.verificationStatus !== 'APPROVED') {
    return next(
      new AppError(
        `Forbidden: NGO is currently ${req.user.ngoProfile.verificationStatus}. Only APPROVED NGOs can perform this action.`,
        403
      )
    );
  }
  next();
};
