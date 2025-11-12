import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/middleware.js';
import { storage } from '../../_lib/storage.js';

export default requireAuth(async (req: VercelRequest, res: VercelResponse) => {
  // @ts-ignore
  const user = req.user as { id: string; userType: string };

  if (user.userType !== 'business') {
    return res.status(403).json({ message: 'Business access required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const inquiries = await storage.getInquiriesByBusiness(user.id);
    res.json(inquiries);
  } catch (error) {
    console.error('Error fetching business inquiries:', error);
    res.status(500).json({ message: 'Failed to fetch inquiries' });
  }
});
