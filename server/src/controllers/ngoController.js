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

// Public: urgent help search
export const searchUrgent = async (req, res, next) => {
  try {
    const result = await ngoService.searchUrgentNgos(req.query);
    res.status(200).json({
      data: result.data.map(toPublicNgo),
      pagination: result.pagination
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
    const updated = await ngoService.updateNgoStatus(req.user, req.params.id, req.body);
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

// NGO owner: upload verification document (PDF/JPG/PNG up to 5MB)
export const uploadDocument = async (req, res, next) => {
  try {
    const doc = await ngoService.uploadNgoDocument(req.user.id, req.file, req.body);
    res.status(201).json({
      data: {
        id: doc.id,
        docType: doc.docType,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        createdAt: doc.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// NGO owner: delete verification document
export const deleteDocument = async (req, res, next) => {
  try {
    await ngoService.deleteNgoDocument(req.user.id, req.params.docId);
    res.status(200).json({
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// NGO owner: list their own verification documents
export const listMyDocuments = async (req, res, next) => {
  try {
    const docs = await ngoService.listMyDocuments(req.user.id);
    res.status(200).json({
      data: docs.map((d) => ({
        id: d.id,
        docType: d.docType,
        originalName: d.originalName,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        createdAt: d.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// NGO owner: resubmit for verification after rejection
export const resubmit = async (req, res, next) => {
  try {
    const updated = await ngoService.resubmitVerification(req.user.id);
    res.status(200).json({
      data: toPrivateNgo(updated),
      message: 'Verification resubmitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Admin only: stream a document directly (Content-Disposition inline)
export const streamDocument = async (req, res, next) => {
  try {
    const docData = await ngoService.streamDocumentForAdmin(req.params.docId);
    res.setHeader('Content-Type', docData.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${docData.originalName}"`);
    docData.stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// Admin only: list all documents for a specific NGO
export const listAdminDocuments = async (req, res, next) => {
  try {
    const docs = await ngoService.listDocumentsForAdmin(req.params.id);
    res.status(200).json({
      data: docs.map((d) => ({
        id: d.id,
        docType: d.docType,
        originalName: d.originalName,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        createdAt: d.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Admin only: list review history for an NGO
export const listAdminReviews = async (req, res, next) => {
  try {
    const reviews = await ngoService.listReviewsForAdmin(req.params.id);
    res.status(200).json({
      data: reviews.map((r) => ({
        id: r.id,
        fromStatus: r.fromStatus,
        toStatus: r.toStatus,
        notes: r.notes,
        reviewerName: r.reviewer?.name,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};
