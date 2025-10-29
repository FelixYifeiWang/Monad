import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/middleware';
import { storage } from '../_lib/storage';
import { insertInfluencerPreferencesSchema } from '@shared/schema';
import { fromError } from 'zod-validation-error';

export default requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    try {
      const userId = req.user.id;
      const prefs = await storage.getInfluencerPreferences(userId);
      res.json(prefs);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({ message: 'Failed to fetch preferences' });
    }
  } else if (req.method === 'POST') {
    try {
      const userId = req.user.id;
      const validation = insertInfluencerPreferencesSchema.safeParse({
        ...req.body,
        userId,
      });

      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const prefs = await storage.upsertInfluencerPreferences(validation.data);
      res.json(prefs);
    } catch (error) {
      console.error('Error saving preferences:', error);
      res.status(500).json({ message: 'Failed to save preferences' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
});