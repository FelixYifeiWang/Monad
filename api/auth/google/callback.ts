import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { initAuth } from '../../_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initAuth(req, res);

  // Use a promise wrapper for passport authenticate
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

        // Success - redirect to dashboard
        res.redirect('/dashboard');
        resolve(undefined);
      });
    })(req, res);
  });
}