import * as ngoService from '../services/ngoService.js';
import { toPublicNgo, toPrivateNgo } from '../mappers/ngoMapper.js';
import { toPublicRequest } from '../mappers/requestMapper.js';

// Public: list only APPROVED NGOs
export const listApproved = async (req, res, next) => {
  try {
    const ngos = await ngoService.listApprovedNgos(req.query);
    res.status(200).json({
      data: ngos.map(toPublicNgo)
    });
  } catch (error) {
    next(error);
  }
};

// Public/Protected: get NGO details with safe mapper isolation
export const getById = async (req, res, next) => {
  try {
    const ngo = await ngoService.getNgoById(req.params.id);
    const isOwner = req.user?.id === ngo.userId;
    const isAdmin = req.user?.role === 'admin';

    // If owner or admin, return private fields; otherwise, strictly public
    const payload = isOwner || isAdmin ? toPrivateNgo(ngo) : toPublicNgo(ngo);
    const requests = ngo.requests ? ngo.requests.map(toPublicRequest) : [];

    res.status(200).json({
      data: {
        ...payload,
        requests
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin: list all NGOs across statuses
export const listAllAdmin = async (req, res, next) => {
  try {
    const ngos = await ngoService.listAllNgosForAdmin(req.query.status);
    res.status(200).json({
      data: ngos.map(toPrivateNgo)
    });
  } catch (error) {
    next(error);
  }
};

// Admin: update NGO verification status (APPROVED, REJECTED, SUSPENDED)
export const updateStatus = async (req, res, next) => {
  try {
    const updated = await ngoService.updateNgoStatus(req.params.id, req.body);
    res.status(200).json({
      data: toPrivateNgo(updated)
    });
  } catch (error) {
    next(error);
  }
};

// NGO owner: update their own profile details
export const updateMyProfile = async (req, res, next) => {
  try {
    const updated = await ngoService.updateMyNgoProfile(req.user.id, req.body);
    res.status(200).json({
      data: toPrivateNgo(updated)
    });
  } catch (error) {
    next(error);
  }
};
