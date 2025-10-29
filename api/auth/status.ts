import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isGoogleAuthConfigured } from '../_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.json({
    configured: isGoogleAuthConfigured(),
    message: isGoogleAuthConfigured()
      ? 'Auth configured'
      : 'Please set up Google OAuth credentials. See GOOGLE_OAUTH_SETUP.md',
  });
}