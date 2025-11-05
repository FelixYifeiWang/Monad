import type { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from './storage.js';
import type { SupportedLanguage } from './aiAgent.js';

const PREFERRED_LANGUAGE_COOKIE = 'preferred_language';
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'zh'];

function parsePreferredLanguage(cookieHeader?: string): SupportedLanguage | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(';').map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${PREFERRED_LANGUAGE_COOKIE}=`)) {
      const value = part.substring(PREFERRED_LANGUAGE_COOKIE.length + 1).toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)) {
        return value as SupportedLanguage;
      }
    }
  }
  return undefined;
}

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

  const baseUrl = process.env.PUBLIC_BASE_URL // e.g. https://www.peri-ai.com  (no trailing slash)
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000');

  console.log('🔧 Passport callback URL:', `${baseUrl}/api/auth/google/callback`);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
        callbackURL: `${baseUrl}/api/auth/google/callback`,
        passReqToCallback: true,
      },
      async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          console.log('✅ Google OAuth successful:', email);

          const preferredLanguageFromCookie = parsePreferredLanguage(req.headers?.cookie);
          const existingUser = await storage.getUser(profile.id);
          const existingLanguage = existingUser?.languagePreference === 'zh'
            ? 'zh'
            : existingUser?.languagePreference === 'en'
              ? 'en'
              : undefined;
          const resolvedLanguage: SupportedLanguage = preferredLanguageFromCookie || existingLanguage || 'en';

          await storage.upsertUser({
            id: profile.id,
            email,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
            languagePreference: resolvedLanguage,
          });

          done(null, {
            id: profile.id,
            email,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            profileImageUrl: profile.photos?.[0]?.value,
            languagePreference: resolvedLanguage,
          });
        } catch (error) {
          console.error('❌ OAuth error:', error);
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    console.log('📦 Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('📂 Deserializing user:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.error('❌ User not found:', id);
        return done(null, false);
      }
      console.log('✅ User deserialized:', user.email);
      done(null, user);
    } catch (error) {
      console.error('❌ Deserialization error:', error);
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
    console.log('✅ Using PostgreSQL session store');
  } else {
    console.warn('⚠️  No DATABASE_URL - sessions will not persist!');
  }

  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true, // ✅ CRITICAL for Vercel
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // ✅ 'none' required for secure cookies across domains
      maxAge: sessionTtl,
      path: '/',
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
// Initialize session and passport for a route
export async function initAuth(req: VercelRequest, res: VercelResponse) {
  configurePassport();
  
  const sessionMiddleware = getSessionMiddleware();
  await runMiddleware(req, res, sessionMiddleware);
  await runMiddleware(req, res, passport.initialize());
  await runMiddleware(req, res, passport.session());
  
  // @ts-ignore - express-session adds session property
  console.log('🔍 Session ID:', (req as any).session?.id);
  // @ts-ignore
  console.log('🔍 Session data:', (req as any).session?.passport);
}

// Middleware to require authentication
export function requireAuth(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void | any>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    await initAuth(req, res);

    // @ts-ignore
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      console.log('❌ Authentication failed');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // @ts-ignore
    console.log('✅ Authenticated as:', req.user?.email);
    return handler(req, res);
  };
}
