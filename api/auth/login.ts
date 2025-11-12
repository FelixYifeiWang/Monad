import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { initAuth } from '../_lib/middleware.js';
import type { User } from '../../shared/schema.js';

function resolveUserType(raw: unknown): User["userType"] | undefined {
  if (raw === 'business') return 'business';
  if (raw === 'influencer') return 'influencer';
  return undefined;
}

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
    const expectedUserType = resolveUserType(req.body?.userType);
    const user = await authenticate(req, res);

    if (expectedUserType && user.userType !== expectedUserType) {
      // @ts-ignore
      req.logout?.();
      return res.status(403).json({ message: `Please use the ${expectedUserType} login portal` });
    }

    res.json(user);
  } catch (error: any) {
    const message = error?.message || 'Login failed';
    const status = message.toLowerCase().includes('invalid') ? 401 : 500;
    res.status(status).json({ message });
  }
}
