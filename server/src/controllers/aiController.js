import * as aiService from '../services/aiService.js';
import { toPublicRequest } from '../mappers/requestMapper.js';

// Match a donor's item offer with urgent NGO requests
export const matchOffer = async (req, res, next) => {
  try {
    const matches = await aiService.matchDonorOffer(req.body);
    const sanitizedMatches = matches.map((m) => ({
      matchScore: m.matchScore,
      matchReason: m.matchReason,
      remainingNeeded: m.remainingNeeded,
      request: toPublicRequest(m.request)
    }));

    res.status(200).json({
      data: sanitizedMatches
    });
  } catch (error) {
    next(error);
  }
};

// Help NGOs draft impactful resource requests
export const draftRequest = async (req, res, next) => {
  try {
    const draft = await aiService.generateDraftRequest(req.body);
    res.status(200).json({
      data: draft
    });
  } catch (error) {
    next(error);
  }
};
