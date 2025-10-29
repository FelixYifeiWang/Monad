import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initAuth } from '../_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initAuth(req, res);

  // @ts-ignore
  req.logout((err: any) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    // @ts-ignore
    req.session.destroy((destroyErr: any) => {
      if (destroyErr) {
        console.error('Session destruction error:', destroyErr);
      }
      res.json({ message: 'Logged out' });
    });
  });
}