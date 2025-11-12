import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { initAuth } from '../../_lib/middleware.js';
import type { User } from '../../../shared/schema.js';

type UserType = User["userType"];

function parseUserType(value: unknown): UserType | undefined {
  if (value === 'business') return 'business';
  if (value === 'influencer') return 'influencer';
  return undefined;
}

function sanitizeNext(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('/')) return undefined;
  return value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initAuth(req, res);

  return new Promise((resolve, reject) => {
    passport.authenticate('google', (err: any, user: any, info: any) => {
      if (err) {
        console.error('Auth error:', err);
        return res.redirect('/login?error=auth_failed');
      }

      if (!user) {
        console.error('No user returned:', info);
        return res.redirect('/login?error=no_user');
      }

      // @ts-ignore - Login user manually
      req.login(user, (loginErr: any) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.redirect('/login?error=login_failed');
        }

        const context = (req as any).session?.oauthLoginContext ?? {};
        const expectedUserType = parseUserType(context.userType);
        const next = sanitizeNext(context.next);
        const fallbackUserType = expectedUserType ?? user.userType;
        const destinationFromContext =
          next ??
          (fallbackUserType === 'business' ? '/business/dashboard' : '/');

        const redirectTarget =
          expectedUserType && user.userType !== expectedUserType
            ? expectedUserType === 'business'
              ? '/business?error=wrong_portal'
              : '/login?error=wrong_portal'
            : destinationFromContext;

        // ✅ CRITICAL: Save session before redirect
        // @ts-ignore
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.redirect('/login?error=session_failed');
          }

          if ((req as any).session?.oauthLoginContext) {
            delete (req as any).session.oauthLoginContext;
          }

          console.log('✅ Session saved successfully');
          // Redirect to home after session is saved
          res.redirect(redirectTarget);
          resolve(undefined);
        });
      });
    })(req, res);
  });
}
