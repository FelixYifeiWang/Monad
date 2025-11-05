import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/middleware.js';
import { storage } from '../_lib/storage.js';

const SUPPORTED_LANGUAGES = new Set(['en', 'zh']);

export default requireAuth(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // @ts-ignore - added by requireAuth
    const userId = req.user.id;
    const { language } = req.body ?? {};

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ message: 'Language is required' });
    }

    const normalized = language.toLowerCase();
    if (!SUPPORTED_LANGUAGES.has(normalized)) {
      return res.status(400).json({ message: 'Unsupported language' });
    }

    const user = await storage.updateLanguagePreference(userId, normalized);

    res.json(user);
  } catch (error) {
    console.error('Error updating language preference:', error);
    res.status(500).json({ message: 'Failed to update language preference' });
  }
});
