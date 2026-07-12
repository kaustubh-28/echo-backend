import { NextFunction, Request, Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { ReviewService } from './review.service';
import { DashboardService } from './dashboard.service';
import { sendSuccessResponse } from '@shared/utils/response';
import { env } from '@config/env';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE_MS } from './admin.constants';

export class AdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly reviewService: ReviewService,
    private readonly dashboardService: DashboardService,
  ) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const { admin, token } = await this.authService.login(username, password, ip);

      // Set HTTP-only cookie, SameSite=None in production to support cross-site hosting
      res.cookie(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: ADMIN_COOKIE_MAX_AGE_MS,
      });

      sendSuccessResponse({ res, data: { admin, token } });
    } catch (error) {
      next(error);
    }
  };

  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.logout();

      res.clearCookie(ADMIN_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      });

      sendSuccessResponse({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  };

  getReviewQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, status, category, sort } = req.query;
      const { reviewItems, total, page: pageNum, limit: limitNum } = await this.reviewService.getReviewQueue({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status ? String(status) : undefined,
        category: category ? String(category) : undefined,
        sort: sort ? String(sort) : undefined,
      });
      sendSuccessResponse({
        res,
        data: reviewItems,
        meta: { total, page: pageNum, limit: limitNum },
      });
    } catch (error) {
      next(error);
    }
  };

  approveEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entryId = req.params.id as string;
      const adminId = req.admin!.id;
      const reviewItem = await this.reviewService.approveEntry(entryId, adminId);
      sendSuccessResponse({ res, data: reviewItem });
    } catch (error) {
      next(error);
    }
  };

  removeEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entryId = req.params.id as string;
      const adminId = req.admin!.id;
      const { reason } = req.body;
      const reviewItem = await this.reviewService.removeEntry(entryId, adminId, reason);
      sendSuccessResponse({ res, data: reviewItem });
    } catch (error) {
      next(error);
    }
  };

  getDashboardStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.dashboardService.getDashboardStats();
      sendSuccessResponse({ res, data: stats });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccessResponse({ res, data: req.admin });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminId = req.admin!.id;
      await this.authService.changePassword(adminId, currentPassword, newPassword);

      // Clear Lax cookie on change-password success
      // Clear cookie on change-password success
      res.clearCookie(ADMIN_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      });

      sendSuccessResponse({ res, data: { success: true } });
    } catch (error) {
      next(error);
    }
  };
}

export default AdminController;
