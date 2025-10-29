import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from './storage.js';

// Generate a session secret for development if not provided
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'dev-session-secret-' + Math.random().toString(36);
  console.warn('⚠️  SESSION_SECRET not set. Using temporary session secret.');
}

// Check for Google OAuth credentials
const googleAuthConfigured = !!(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export function isGoogleAuthConfigured(): boolean {
  return googleAuthConfigured;
}

let isPassportConfigured = false;

// Initialize Passport (call once)
export function configurePassport() {
  if (isPassportConfigured) return;

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5000';

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
        callbackURL: `${baseUrl}/api/auth/google/callback`,
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          await storage.upsertUser({
            id: profile.id,
            email,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
          });

          done(null, {
            id: profile.id,
            email,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            profileImageUrl: profile.photos?.[0]?.value,
          });
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(null, false);
    }
  });

  isPassportConfigured = true;
}

// Get session middleware
export function getSessionMiddleware() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  
  let sessionStore;
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: 'sessions',
    });
  }

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Wrapper to run middleware in Vercel
export function runMiddleware(req: VercelRequest, res: VercelResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Initialize session and passport for a route
export async function initAuth(req: VercelRequest, res: VercelResponse) {
  configurePassport();
  
  const sessionMiddleware = getSessionMiddleware();
  await runMiddleware(req, res, sessionMiddleware);
  await runMiddleware(req, res, passport.initialize());
  await runMiddleware(req, res, passport.session());
}

// Middleware to require authentication
export function requireAuth(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | any>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    await initAuth(req, res);

    // @ts-ignore
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // @ts-ignore - Passport adds user to request
    return handler(req, res);
  };
}