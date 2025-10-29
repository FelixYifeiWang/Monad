import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, initAuth } from '../_lib/middleware.js';
import { storage } from '../_lib/storage.js';
// ✅ CHANGE 1: Fix import path
import { insertInquirySchema } from '../../shared/schema';
import { fromError } from 'zod-validation-error';
import { generateInquiryResponse } from '../_lib/aiAgent.js';

// ✅ CHANGE 2: Remove type annotation from handleGet
async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // @ts-ignore - user is added by requireAuth middleware
    const userId = req.user.id;
    const inquiries = await storage.getInquiriesByInfluencer(userId);
    res.json(inquiries);
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Parse body
    const body = {
      ...req.body,
      price: req.body.price ? parseInt(req.body.price) : undefined,
      // Note: File uploads will need special handling with Vercel Blob
      attachmentUrl: req.body.attachmentUrl || undefined,
    };

    const validation = insertInquirySchema.safeParse(body);

    if (!validation.success) {
      return res.status(400).json({ message: fromError(validation.error).toString() });
    }

    const inquiry = await storage.createInquiry(validation.data);

    // Get influencer preferences and generate AI response
    let preferences = await storage.getInfluencerPreferences(validation.data.influencerId);

    // Use default preferences if none are set
    if (!preferences) {
      preferences = {
        id: 'default',
        userId: validation.data.influencerId,
        personalContentPreferences: 'Various collaboration opportunities',
        monetaryBaseline: 500,
        contentLength: 'Flexible',
        additionalGuidelines: null,
        createdAt: null,
        updatedAt: null,
      };
    }

    const aiResponse = await generateInquiryResponse(
      {
        businessEmail: validation.data.businessEmail,
        message: validation.data.message,
        price: validation.data.price,
        companyInfo: validation.data.companyInfo,
      },
      preferences
    );

    await storage.updateInquiryStatus(inquiry.id, 'pending', aiResponse);

    // Create initial AI message in chat
    await storage.addMessage({
      inquiryId: inquiry.id,
      role: 'assistant',
      content: aiResponse,
    });

    res.json({ ...inquiry, aiResponse });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ message: 'Failed to create inquiry' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // GET requires auth
    return requireAuth(handleGet)(req, res);
  } else if (req.method === 'POST') {
    // POST is public (businesses submit inquiries)
    await initAuth(req, res);
    return handlePost(req, res);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}