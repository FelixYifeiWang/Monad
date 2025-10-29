import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/middleware.js';
import { storage } from '../../_lib/storage.js';
import { sendInquiryStatusEmail } from '../../_lib/email.js';

export default requireAuth(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    const { status, message } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Inquiry ID is required' });
    }

    if (!['pending', 'approved', 'rejected', 'needs_info'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const inquiry = await storage.getInquiry(id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    const updatedInquiry = await storage.updateInquiryStatus(id, status);

    if (status !== 'pending') {
      // @ts-ignore - user is added by requireAuth middleware
      const userId = req.user.id;
      const influencer = await storage.getUser(userId);

      if (influencer && inquiry.businessEmail) {
        const influencerName = influencer.firstName
          ? `${influencer.firstName}${influencer.lastName ? ` ${influencer.lastName}` : ''}`
          : influencer.username || 'The influencer';

        sendInquiryStatusEmail(
          inquiry.businessEmail,
          influencerName,
          status as 'approved' | 'rejected' | 'needs_info',
          message || undefined
        ).catch((err) => console.error('Failed to send email:', err));
      }
    }

    res.json(updatedInquiry);
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    res.status(500).json({ message: 'Failed to update inquiry status' });
  }
});