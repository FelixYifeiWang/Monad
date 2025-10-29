import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Generate a session secret for development if not provided
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "dev-session-secret-" + Math.random().toString(36);
  console.warn("⚠️  SESSION_SECRET not set. Using temporary session secret for development. Sessions will not persist across restarts.");
}

// Check for Google OAuth credentials
const googleAuthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (!googleAuthConfigured) {
  console.warn("\n" + "=".repeat(80));
  console.warn("⚠️  Google OAuth is NOT configured!");
  console.warn("📖 Please see GOOGLE_OAUTH_SETUP.md for setup instructions.");
  console.warn("🔑 You need to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Secrets.");
  console.warn("=".repeat(80) + "\n");
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  
  // Use PostgreSQL session store if DATABASE_URL is available, otherwise use default memory store
  let sessionStore;
  if (process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
    console.log("✅ Using PostgreSQL session store");
  } else {
    console.warn("⚠️  DATABASE_URL not found. Using in-memory session store (sessions will not persist across restarts).");
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Get the base URL for callbacks
  const baseUrl = process.env.REPLIT_DEPLOYMENT_URL 
    ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
    : `http://localhost:5000`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "placeholder-client-id",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-client-secret",
        callbackURL: `${baseUrl}/api/auth/google/callback`,
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // Extract user information from Google profile
          const email = profile.emails?.[0]?.value;
          const firstName = profile.name?.givenName;
          const lastName = profile.name?.familyName;
          const profileImageUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error("No email found in Google profile"));
          }

          // Upsert user in database
          await storage.upsertUser({
            id: profile.id,
            email,
            firstName: firstName || null,
            lastName: lastName || null,
            profileImageUrl: profileImageUrl || null,
          });

          // Return user object for session
          const user = {
            id: profile.id,
            email,
            firstName,
            lastName,
            profileImageUrl,
          };

          done(null, user);
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
      if (!user) {
        // User not found - clear the session
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      // Error fetching user - clear the session
      done(null, false);
    }
  });

  // Auth routes
  app.get("/api/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
  }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      // Successful authentication, redirect to dashboard
      res.redirect("/dashboard");
    }
  );

  app.get("/api/auth/user", ((req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  }) as RequestHandler);

  app.post("/api/auth/logout", ((req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destruction error:", destroyErr);
        }
        res.json({ message: "Logged out" });
      });
    });
  }) as RequestHandler);
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export function isGoogleAuthConfigured(): boolean {
  return googleAuthConfigured;
}
