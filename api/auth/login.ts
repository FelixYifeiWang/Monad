import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { initAuth } from '../_lib/middleware.js';
import { sanitizeUser } from '../_lib/userUtils.js';

function authenticate(req: VercelRequest, res: VercelResponse): Promise<any> {
  return new Promise((resolve, reject) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return reject(err);
      if (!user) return reject(new Error(info?.message || 'Invalid email or password'));

      // @ts-ignore
      req.login(user, (loginErr: unknown) => {
        if (loginErr) return reject(loginErr);
        resolve(user);
      });
    })(req, res);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await initAuth(req, res);
    const user = await authenticate(req, res);
    res.json(user);
  } catch (error: any) {
    const message = error?.message || 'Login failed';
    const status = message.toLowerCase().includes('invalid') ? 401 : 500;
    res.status(status).json({ message });
  }
}
