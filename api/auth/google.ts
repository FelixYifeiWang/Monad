import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { initAuth } from '../_lib/middleware.js';
import type { User } from '../../shared/schema.js';

function resolveUserType(raw: unknown): User["userType"] | undefined {
  if (raw === 'business') return 'business';
  if (raw === 'influencer') return 'influencer';
  return undefined;
}

function sanitizeNext(next: unknown): string | undefined {
  if (typeof next !== 'string') return undefined;
  if (!next.startsWith('/')) return undefined;
  return next;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initAuth(req, res);

  const expectedUserType = resolveUserType(req.query?.userType);
  const next = sanitizeNext(req.query?.next);

  // @ts-ignore
  req.session.oauthLoginContext = {
    userType: expectedUserType,
    next,
  };

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
