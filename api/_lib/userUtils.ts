import type { User } from "../../shared/schema.js";

export type PublicUser = Omit<User, "passwordHash"> & { passwordHash: null };

export function sanitizeUser(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  return {
    ...rest,
    passwordHash: null,
  };
}
