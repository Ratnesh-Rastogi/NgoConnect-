import * as requestService from '../services/requestService.js';
import { toPublicRequest } from '../mappers/requestMapper.js';

// Create a resource request (Only APPROVED NGOs)
export const create = async (req, res, next) => {
  try {
    const created = await requestService.createRequest(req.user, req.body);
    res.status(201).json({
      data: toPublicRequest(created)
    });
  } catch (error) {
    next(error);
  }
};

// Public listing of resource requests
export const list = async (req, res, next) => {
  try {
    const requests = await requestService.listRequests(req.query);
    res.status(200).json({
      data: requests.map(toPublicRequest)
    });
  } catch (error) {
    next(error);
  }
};

// Public request details
export const getById = async (req, res, next) => {
  try {
    const request = await requestService.getRequestById(req.params.id);
    res.status(200).json({
      data: toPublicRequest(request)
    });
  } catch (error) {
    next(error);
  }
};

// Update request (Role + ownership checked in service)
export const update = async (req, res, next) => {
  try {
    const updated = await requestService.updateRequest(req.user, req.params.id, req.body);
    res.status(200).json({
      data: toPublicRequest(updated)
    });
  } catch (error) {
    next(error);
  }
};

// Delete request (Role + ownership checked in service)
export const deleteReq = async (req, res, next) => {
  try {
    await requestService.deleteRequest(req.user, req.params.id);
    res.status(200).json({
      message: 'Resource request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// NGO owner: view requests created by their NGO
export const listMyRequests = async (req, res, next) => {
  try {
    const requests = await requestService.listMyNgoRequests(req.user.id);
    res.status(200).json({
      data: requests.map(toPublicRequest)
    });
  } catch (error) {
    next(error);
  }
};
