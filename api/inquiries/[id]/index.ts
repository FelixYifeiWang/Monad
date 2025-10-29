import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, initAuth } from '../../_lib/middleware';
import { storage } from '../../_lib/storage';

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Inquiry ID is required' });
    }

    const inquiry = await storage.getInquiry(id);

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    res.json(inquiry);
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    res.status(500).json({ message: 'Failed to fetch inquiry' });
  }
}

async function handleDelete(req: VercelRequest & { user: any }, res: VercelResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Inquiry ID is required' });
    }

    const inquiry = await storage.getInquiry(id);

    if (!inquiry) {
      return res.status(404).json({ message: 'Inquiry not found' });
    }

    // Verify that the authenticated user is the influencer for this inquiry
    const userId = req.user.id;
    if (inquiry.influencerId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await storage.deleteInquiry(id);
    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({ message: 'Failed to delete inquiry' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await initAuth(req, res);

  if (req.method === 'GET') {
    // GET is public (for business chat)
    return handleGet(req, res);
  } else if (req.method === 'DELETE') {
    // DELETE requires auth
    return requireAuth(handleDelete)(req, res);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}