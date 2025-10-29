import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/middleware';
import { storage } from '../_lib/storage';

export default requireAuth(async (req, res) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const userId = req.user.id;
    let { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Normalize username (trim and lowercase)
    username = username.trim().toLowerCase();

    // Validate username format (alphanumeric, hyphens, underscores, 3-30 chars)
    const usernameRegex = /^[a-z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        message:
          'Username must be 3-30 characters and contain only lowercase letters, numbers, hyphens, and underscores',
      });
    }

    // Get current user to check if username is unchanged
    const currentUser = await storage.getUser(userId);
    if (currentUser && currentUser.username === username) {
      // Username unchanged, return success without DB write
      return res.json({
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        profileImageUrl: currentUser.profileImageUrl,
      });
    }

    // Check if username is already taken
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    const user = await storage.updateUsername(userId, username);

    // Return only necessary fields
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ message: 'Failed to update username' });
  }
});