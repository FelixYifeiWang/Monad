import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/middleware.js';
import { storage } from '../_lib/storage.js';
import { sanitizeUser } from '../_lib/userUtils.js';

export default requireAuth(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // @ts-ignore - user is added by requireAuth middleware
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});
