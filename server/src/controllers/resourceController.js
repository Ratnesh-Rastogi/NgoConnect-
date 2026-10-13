import * as resourceService from '../services/resourceService.js';
import { toPublicResource } from '../mappers/resourceMapper.js';
import { toSafeTransfer } from '../mappers/transferMapper.js';

// Create a resource listing (Donors and APPROVED NGOs)
export const create = async (req, res, next) => {
  try {
    const created = await resourceService.createResource(req.user, req.body);
    res.status(201).json({
      data: toPublicResource(created)
    });
  } catch (error) {
    next(error);
  }
};

// Public listing of active resources (with optional filters)
export const list = async (req, res, next) => {
  try {
    const resources = await resourceService.listResources(req.query);
    res.status(200).json({
      data: resources.map(toPublicResource)
    });
  } catch (error) {
    next(error);
  }
};

// Owner listings
export const listMy = async (req, res, next) => {
  try {
    const resources = await resourceService.listMyResources(req.user.id);
    res.status(200).json({
      data: resources.map(toPublicResource)
    });
  } catch (error) {
    next(error);
  }
};

// Public single resource details
export const getById = async (req, res, next) => {
  try {
    const resource = await resourceService.getResourceById(req.params.id);
    res.status(200).json({
      data: toPublicResource(resource)
    });
  } catch (error) {
    next(error);
  }
};

// Edit resource listing (Owner or Admin)
export const update = async (req, res, next) => {
  try {
    const updated = await resourceService.updateResource(req.user, req.params.id, req.body);
    res.status(200).json({
      data: toPublicResource(updated)
    });
  } catch (error) {
    next(error);
  }
};

// Withdraw resource listing (Owner or Admin)
export const withdraw = async (req, res, next) => {
  try {
    const withdrawn = await resourceService.withdrawResource(req.user, req.params.id);
    res.status(200).json({
      data: toPublicResource(withdrawn)
    });
  } catch (error) {
    next(error);
  }
};

// Claim quantity from a resource listing (APPROVED NGO only)
export const claim = async (req, res, next) => {
  try {
    const transfer = await resourceService.claimResource(req.user, req.params.id, req.body);
    res.status(201).json({
      data: toSafeTransfer(transfer)
    });
  } catch (error) {
    next(error);
  }
};
