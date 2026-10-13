import * as transferService from '../services/transferService.js';
import { toSafeTransfer } from '../mappers/transferMapper.js';

// Donor pledges a transfer/donation
export const create = async (req, res, next) => {
  try {
    const transfer = await transferService.createTransfer(req.user, req.body);
    res.status(201).json({
      data: toSafeTransfer(transfer)
    });
  } catch (error) {
    next(error);
  }
};

// Transition transfer lifecycle (IN_TRANSIT, RECEIVED, CANCELLED)
export const updateStatus = async (req, res, next) => {
  try {
    const transfer = await transferService.updateTransferStatus(req.user, req.params.id, req.body);
    res.status(200).json({
      data: toSafeTransfer(transfer)
    });
  } catch (error) {
    next(error);
  }
};

// List transfers pledged by the authenticated donor
export const listMyTransfers = async (req, res, next) => {
  try {
    const transfers = await transferService.listDonorTransfers(req.user.id);
    res.status(200).json({
      data: transfers.map(toSafeTransfer)
    });
  } catch (error) {
    next(error);
  }
};

// List transfers received by the authenticated NGO
export const listNgoTransfers = async (req, res, next) => {
  try {
    const transfers = await transferService.listNgoTransfers(req.user.id);
    res.status(200).json({
      data: transfers.map(toSafeTransfer)
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve a single transfer by ID
export const getById = async (req, res, next) => {
  try {
    const transfer = await transferService.getTransferById(req.user, req.params.id);
    res.status(200).json({
      data: toSafeTransfer(transfer)
    });
  } catch (error) {
    next(error);
  }
};
