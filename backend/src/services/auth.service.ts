import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import type { LoginInput, RegisterInput } from '../schemas/auth.schemas';
import { publicUser, signToken } from '../utils/auth';
import { HttpError } from '../utils/errors';

export const register = async ({ name, email, password }: RegisterInput) => {
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    return { user: publicUser(user), token: signToken(user) };
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002' || error instanceof Error && error.message.includes('Unique constraint')) {
      throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'Email already registered.');
    }
    throw error;
  }
};

export const login = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  return { user: publicUser(user), token: signToken(user) };
};

export const me = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'User session is invalid.');
  return publicUser(user);
};
