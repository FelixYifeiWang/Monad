import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username is required' });
    }

    const user = await storage.getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only return public info
    res.json({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      languagePreference: user.languagePreference,
    });
  } catch (error) {
    console.error('Error fetching user by username:', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
}
