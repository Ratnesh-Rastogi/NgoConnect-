import { prisma } from '../config/prisma.js';

// Calculate match score between a donor offer and an NGO resource need
export const matchDonorOffer = async ({ category, itemName, quantity, location }) => {
  // Find open requests from APPROVED NGOs (category is loaded now)
  const openRequests = await prisma.resourceRequest.findMany({
    where: {
      status: { in: ['OPEN', 'PARTIAL'] },
      ngoProfile: {
        verificationStatus: 'APPROVED'
      }
    },
    include: {
      ngoProfile: true,
      category: true
    }
  });

  // Make every input safe, so nothing is ever undefined
  const categoryInput = String(category ?? '').trim().toLowerCase();
  const locationInput = String(location ?? '').trim().toLowerCase();

  const offerTokens = String(itemName ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scoredMatches = openRequests.map((req) => {
    let score = 0;
    const reasons = [];

    // Safe values for this request
    const reqCategoryName = String(req.category?.name ?? '');
    const reqCategory = reqCategoryName.toLowerCase();
    const reqCategorySlug = String(req.category?.slug ?? '').toLowerCase();
    const reqLocationText = String(req.location ?? req.city ?? '');
    const reqLocation = reqLocationText.toLowerCase();

    // 1. Category alignment (match by name or slug)
    if (categoryInput && reqCategory) {
      if (reqCategory === categoryInput || reqCategorySlug === categoryInput) {
        score += 35;
        reasons.push(`Direct category match in "${reqCategoryName}"`);
      } else if (
        reqCategory.includes(categoryInput) ||
        categoryInput.includes(reqCategory)
      ) {
        score += 20;
        reasons.push('Related category match');
      }
    }

    // 2. Keyword relevance in title and description
    const textBlob = `${req.title ?? ''} ${req.description ?? ''}`.toLowerCase();
    let keywordHits = 0;
    for (const token of offerTokens) {
      if (textBlob.includes(token)) {
        keywordHits += 1;
      }
    }
    if (keywordHits > 0) {
      score += Math.min(30, keywordHits * 15);
      reasons.push('Matched keywords in request title/description');
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
      locationInput &&
      reqLocation &&
      (reqLocation.includes(locationInput) || locationInput.includes(reqLocation))
    ) {
      score += 15;
      reasons.push(`Matches location "${reqLocationText}"`);
    }

    // 5. Quantity compatibility
    const unreserved =
      (req.quantityNeeded ?? 0) - (req.quantityFulfilled ?? 0) - (req.quantityReserved ?? 0);
    if (unreserved > 0 && quantity > 0) {
      if (quantity <= unreserved) {
        score += 10;
        reasons.push(`Can immediately utilize ${quantity} ${req.unit ?? 'units'}`);
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
