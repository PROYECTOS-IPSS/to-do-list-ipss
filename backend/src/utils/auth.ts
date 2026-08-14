import jwt from 'jsonwebtoken';

export type AuthUser = { id: string; email: string; name: string };

type TokenPayload = { sub: string };

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.');
  return process.env.JWT_SECRET;
};

export const signToken = (user: AuthUser) => jwt.sign({ sub: user.id }, secret(), { expiresIn: '1h' });

export const verifyToken = (token: string) => {
  const payload = jwt.verify(token, secret()) as TokenPayload;
  if (!payload.sub) throw new Error('Invalid token subject.');
  return payload.sub;
};

export const publicUser = ({ id, email, name }: AuthUser) => ({ id, email, name });
