import { NextFunction, Request, Response } from 'express';
import { AppError } from '@shared/errors';
import { AdminRepository } from '../modules/admin/admin.repository';
import { AuthService } from '../modules/auth/auth.service';
import { ADMIN_COOKIE_NAME } from '../modules/admin/admin.constants';

const adminRepository = new AdminRepository();
const authService = new AuthService(adminRepository);

export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.[ADMIN_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const admin = await authService.verifySession(token);
    req.admin = admin;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid or expired token', 401, 'UNAUTHORIZED'));
    }
  }
}

export default requireAdmin;
