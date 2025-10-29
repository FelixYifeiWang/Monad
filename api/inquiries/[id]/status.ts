import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/middleware';
import { storage } from '../../_lib/storage';
import { sendInquiryStatusEmail } from '../../_lib/email';

export default requireAuth(async (req, res) => {
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

    // Get inquiry details before updating
    const inquiry = await storage.getInquiry(id);
    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Update the status
    const updatedInquiry = await storage.updateInquiryStatus(id, status);

    // Send email notification for non-pending statuses
    if (status !== 'pending') {
      const userId = req.user.id;
      const influencer = await storage.getUser(userId);

      if (influencer && inquiry.businessEmail) {
        const influencerName = influencer.firstName
          ? `${influencer.firstName}${influencer.lastName ? ` ${influencer.lastName}` : ''}`
          : influencer.username || 'The influencer';

        // Send email in background (don't await to avoid slowing down response)
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