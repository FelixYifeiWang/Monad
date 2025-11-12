import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../_lib/middleware.js';
import { storage } from '../../_lib/storage.js';
import { insertBusinessProfileSchema } from '../../../shared/schema.js';
import { fromError } from 'zod-validation-error';

export default requireAuth(async (req: VercelRequest, res: VercelResponse) => {
  // @ts-ignore
  const user = req.user as { id: string; userType: string };

  if (user.userType !== 'business') {
    return res.status(403).json({ message: 'Business access required' });
  }

  if (req.method === 'GET') {
    try {
      const profile = await storage.getBusinessProfile(user.id);
      res.json(profile ?? null);
    } catch (error) {
      console.error('Error fetching business profile:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const validation = insertBusinessProfileSchema.safeParse({
        ...req.body,
        userId: user.id,
      });

      if (!validation.success) {
        return res.status(400).json({ message: fromError(validation.error).toString() });
      }

      const payload = {
        ...validation.data,
        socialLinks:
          validation.data.socialLinks && typeof validation.data.socialLinks === 'object'
            ? validation.data.socialLinks
            : undefined,
      };

      const profile = await storage.upsertBusinessProfile(payload);
      res.json(profile);
    } catch (error) {
      console.error('Error saving business profile:', error);
      res.status(500).json({ message: 'Failed to save profile' });
    }
    return;
  }

  res.status(405).json({ message: 'Method not allowed' });
});
