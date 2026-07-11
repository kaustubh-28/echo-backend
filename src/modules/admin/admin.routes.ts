import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest.middleware';
import { requireAdmin } from '../../middleware/requireAdmin';
import { AdminController } from './admin.controller';
import { AdminRepository } from './admin.repository';
import { AuthService } from '../auth/auth.service';
import { ReviewService } from './review.service';
import { DashboardService } from './dashboard.service';
import {
  adminLoginSchema,
  adminApproveSchema,
  adminRemoveSchema,
  adminChangePasswordSchema,
} from './admin.validation';
import { EntriesRepository } from '../entries/entries.repository';
import { adminLoginRateLimiter } from '../../middleware/rateLimit.middleware';

export function createAdminRouter(): Router {
  const router = Router();
  const repository = new AdminRepository();
  const entriesRepository = new EntriesRepository();

  const authService = new AuthService(repository);
  const reviewService = new ReviewService(entriesRepository, repository);
  const dashboardService = new DashboardService();

  const controller = new AdminController(authService, reviewService, dashboardService);

  router.post(
    '/admin/login',
    adminLoginRateLimiter,
    validateRequest(adminLoginSchema),
    controller.login,
  );
  router.post('/admin/logout', controller.logout);

  router.get('/admin/me', requireAdmin, controller.getMe);

  router.patch(
    '/admin/change-password',
    requireAdmin,
    validateRequest(adminChangePasswordSchema),
    controller.changePassword,
  );

  // Moderation routes
  router.get('/admin/review-queue', requireAdmin, controller.getReviewQueue);
  router.patch(
    '/admin/entries/:id/approve',
    requireAdmin,
    validateRequest(adminApproveSchema),
    controller.approveEntry,
  );
  router.patch(
    '/admin/entries/:id/remove',
    requireAdmin,
    validateRequest(adminRemoveSchema),
    controller.removeEntry,
  );

  // Dashboard stats route
  router.get('/admin/dashboard', requireAdmin, controller.getDashboardStats);

  return router;
}

export default createAdminRouter;
