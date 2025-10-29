import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initAuth } from '../../_lib/middleware';
import { storage } from '../../_lib/storage';
import { generateRecommendation } from '../../_lib/aiAgent';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initAuth(req, res);

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Inquiry ID is required' });
    }

    // Get inquiry
    const inquiry = await storage.getInquiry(id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    if (!inquiry.chatActive) {
      return res.status(400).json({ message: 'This conversation is already closed' });
    }

    // Get conversation history
    const conversationHistory = await storage.getMessagesByInquiry(id);

    // Get influencer preferences
    let preferences = await storage.getInfluencerPreferences(inquiry.influencerId);

    // Use default preferences if none are set
    if (!preferences) {
      preferences = {
        id: 'default',
        userId: inquiry.influencerId,
        personalContentPreferences: 'Various collaboration opportunities',
        monetaryBaseline: 500,
        contentLength: 'Flexible',
        additionalGuidelines: null,
        createdAt: null,
        updatedAt: null,
      };
    }

    const recommendation = await generateRecommendation(
      conversationHistory,
      {
        businessEmail: inquiry.businessEmail,
        message: inquiry.message,
        price: inquiry.price,
        companyInfo: inquiry.companyInfo,
      },
      preferences
    );

    // Close chat and save recommendation
    const updatedInquiry = await storage.closeInquiryChat(id, recommendation);

    res.json(updatedInquiry);
  } catch (error) {
    console.error('Error closing chat:', error);
    res.status(500).json({ message: 'Failed to close chat' });
  }
}