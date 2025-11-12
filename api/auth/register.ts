import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { initAuth, getPreferredLanguageFromRequest } from '../_lib/middleware.js';
import { storage } from '../_lib/storage.js';
import { sanitizeUser } from '../_lib/userUtils.js';
import type { SupportedLanguage } from '../_lib/aiAgent.js';
import type { User } from '../../shared/schema.js';

const MIN_PASSWORD_LENGTH = 8;
function resolveUserType(raw: unknown): User["userType"] {
  if (raw === 'business') return 'business';
  if (raw === 'influencer') return 'influencer';
  return 'influencer';
}

async function loginUser(req: VercelRequest, user: any) {
  return new Promise<void>((resolve, reject) => {
    // @ts-ignore
    req.login(user, (err: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await initAuth(req, res);

  const { email, password, userType: rawUserType } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required' });
  }

  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const requestedUserType = resolveUserType(rawUserType);
  const existingUser = await storage.getUserByEmail(normalizedEmail, requestedUserType);
  const passwordHash = await bcrypt.hash(password, 10);
  let userToReturn;

  if (existingUser) {
    if (existingUser.passwordHash) {
      return res.status(409).json({ message: 'Account already exists. Please log in.' });
    }

    const updated = await storage.updatePassword(existingUser.id, passwordHash);
    userToReturn = sanitizeUser(updated);
  } else {
    const preferredLanguage: SupportedLanguage = getPreferredLanguageFromRequest(req) ?? 'en';
    const newUser = await storage.createUser({
      email: normalizedEmail,
      passwordHash,
      languagePreference: preferredLanguage,
      userType: requestedUserType,
    });

    if (requestedUserType === 'business') {
      await storage.upsertBusinessProfile({ userId: newUser.id });
    }
    userToReturn = sanitizeUser(newUser);
  }

  await loginUser(req, userToReturn);

  res.status(existingUser ? 200 : 201).json(userToReturn);
}
