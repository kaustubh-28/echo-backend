import jwt from 'jsonwebtoken';
import { env } from '@config/env';

export interface JwtPayload {
  sub: string;
  username: string;
  role: 'admin';
}

export function generate(payload: { sub: string; username: string }): string {
  return jwt.sign(
    {
      sub: payload.sub,
      username: payload.username,
      role: 'admin',
    },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

export function verify(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
