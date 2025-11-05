import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { initAuth, getPreferredLanguageFromRequest } from '../_lib/middleware.js';
import { storage } from '../_lib/storage.js';
import { sanitizeUser } from '../_lib/userUtils.js';
import type { SupportedLanguage } from '../_lib/aiAgent.js';

const MIN_PASSWORD_LENGTH = 8;

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

  const { email, password } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required' });
  }

  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await storage.getUserByEmail(normalizedEmail);
  const passwordHash = await bcrypt.hash(password, 10);
  let userToReturn;

  if (existingUser) {
    const updated = await storage.updatePassword(existingUser.id, passwordHash);
    userToReturn = sanitizeUser(updated);
  } else {
    const preferredLanguage: SupportedLanguage = getPreferredLanguageFromRequest(req) ?? 'en';
    const newUser = await storage.createUser({
      email: normalizedEmail,
      passwordHash,
      languagePreference: preferredLanguage,
    });
    userToReturn = sanitizeUser(newUser);
  }

  await loginUser(req, userToReturn);

  res.status(existingUser ? 200 : 201).json(userToReturn);
}
