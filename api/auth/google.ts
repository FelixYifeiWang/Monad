import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { initAuth } from '../_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initAuth(req, res);

  // Use a promise wrapper for passport authenticate
  return new Promise((resolve) => {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: true,
    })(req, res, () => {
      resolve(undefined);
    });
  });
}