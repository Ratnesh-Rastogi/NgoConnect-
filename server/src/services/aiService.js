import { prisma } from '../config/prisma.js';

// Calculate match score between a donor offer and an NGO resource need
export const matchDonorOffer = async ({ category, itemName, quantity, location }) => {
  // Find open requests from APPROVED NGOs
  const openRequests = await prisma.resourceRequest.findMany({
    where: {
      status: { in: ['OPEN', 'PARTIAL'] },
      ngoProfile: {
        verificationStatus: 'APPROVED'
      }
    },
    include: {
      ngoProfile: true
    }
  });

  const offerTokens = (itemName || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scoredMatches = openRequests.map((req) => {
    let score = 0;
    const reasons = [];

    // 1. Category alignment
    if (req.category.toLowerCase() === category.toLowerCase()) {
      score += 35;
      reasons.push(`Direct category match in "${req.category}"`);
    } else if (
      req.category.toLowerCase().includes(category.toLowerCase()) ||
      category.toLowerCase().includes(req.category.toLowerCase())
    ) {
      score += 20;
      reasons.push(`Related category match`);
    }

    // 2. Keyword relevance in title and description
    const textBlob = `${req.title} ${req.description}`.toLowerCase();
    let keywordHits = 0;
    for (const token of offerTokens) {
      if (textBlob.includes(token)) {
        keywordHits += 1;
      }
    }
    if (keywordHits > 0) {
      const kwScore = Math.min(30, keywordHits * 15);
      score += kwScore;
      reasons.push(`Matched keywords in request title/description`);
    }

    // 3. Urgency weighting
    if (req.urgency === 'CRITICAL') {
      score += 20;
      reasons.push('CRITICAL priority need');
    } else if (req.urgency === 'HIGH') {
      score += 15;
      reasons.push('HIGH priority need');
    } else if (req.urgency === 'MEDIUM') {
      score += 10;
    } else {
      score += 5;
    }

    // 4. Location proximity
    if (
      location &&
      req.location &&
      (req.location.toLowerCase().includes(location.toLowerCase()) ||
        location.toLowerCase().includes(req.location.toLowerCase()))
    ) {
      score += 15;
      reasons.push(`Matches location "${req.location}"`);
    }

    // 5. Quantity compatibility
    const unreserved = req.quantityNeeded - req.quantityFulfilled - req.quantityReserved;
    if (unreserved > 0 && quantity > 0) {
      if (quantity <= unreserved) {
        score += 10;
        reasons.push(`Can immediately utilize ${quantity} ${req.unit}`);
      } else {
        score += 5;
        reasons.push(`Partially fulfills request (${unreserved} needed)`);
      }
    }

    const normalizedScore = Math.min(100, Math.max(10, score));

    return {
      request: req,
      matchScore: normalizedScore,
      matchReason: reasons.join(' • '),
      remainingNeeded: Math.max(0, unreserved)
    };
  });

  // Sort descending by match score
  return scoredMatches
    .filter((m) => m.matchScore >= 20)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);
};

// Plain rule-based AI draft generator to help NGOs draft high-impact resource requests
export const generateDraftRequest = async ({ topic, category, urgency }) => {
  const urgencyLevel = urgency || 'MEDIUM';
  const cleanTopic = topic.trim();

  const title = `Urgent Provisioning: ${cleanTopic}`;
  const description = `Our on-ground teams are actively requesting donations for ${cleanTopic}. ` +
    `Your support will directly aid vulnerable beneficiaries served under our ${category} relief programs. ` +
    `Supplies are audited, logged, and distributed immediately upon receipt.`;

  return {
    suggestedTitle: title,
    suggestedDescription: description,
    category,
    urgency: urgencyLevel,
    suggestedUnit: 'units',
    tips: [
      'Specify exact delivery location and warehouse contact.',
      'Group small items into standard shipping kits for easier donor fulfillment.'
    ]
  };
};
