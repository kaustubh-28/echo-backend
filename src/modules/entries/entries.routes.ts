import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest.middleware';
import { EntriesController } from './entries.controller';
import { EntriesRepository } from './entries.repository';
import { VisitorService } from '@shared/services/visitor.service';
import {
  createEntryRateLimiter,
  helpfulRateLimiter,
  reportRateLimiter,
} from '../../middleware/rateLimit.middleware';
import { EntriesService } from './entries.service';
import { HelpfulRepository } from './helpful.repository';
import { ReportRepository } from './report.repository';
import { HelpfulService } from './helpful.service';
import { NotificationDispatcher } from '../notifications/notificationDispatcher';
import {
  createEntrySchema,
  queryEntriesSchema,
  searchEntriesSchema,
  randomEntriesSchema,
  getEntryStatusSchema,
  markHelpfulSchema,
  reportEntrySchema,
} from './entries.validation';

export function createEntriesRouter(): Router {
  const router = Router();
  const repository = new EntriesRepository();
  const helpfulRepository = new HelpfulRepository();
  const reportRepository = new ReportRepository();
  const visitorService = new VisitorService();
  const notificationDispatcher = new NotificationDispatcher();

  const helpfulService = new HelpfulService(
    repository,
    helpfulRepository,
    visitorService,
  );

  const service = new EntriesService(
    repository,
    reportRepository,
    visitorService,
    notificationDispatcher,
  );

  const controller = new EntriesController(service, helpfulService);

  router.post(
    '/entries',
    createEntryRateLimiter,
    validateRequest(createEntrySchema),
    controller.createEntry,
  );
  router.get('/entries', validateRequest(queryEntriesSchema), controller.getEntries);
  router.get('/entries/search', validateRequest(searchEntriesSchema), controller.searchEntries);
  router.get('/entries/random', validateRequest(randomEntriesSchema), controller.getRandomEntry);
  router.get('/entries/daily', controller.getDailyEntry);
  router.get(
    '/entries/status/:submissionId',
    validateRequest(getEntryStatusSchema),
    controller.getEntryStatus,
  );
  router.get(
    '/status/:submissionId',
    validateRequest(getEntryStatusSchema),
    (req, res) => {
      res.redirect(301, `/api/v1/entries/status/${req.params.submissionId}`);
    },
  );
  router.post(
    '/entries/:id/helpful',
    helpfulRateLimiter,
    validateRequest(markHelpfulSchema),
    controller.markHelpful,
  );
  router.post(
    '/entries/:id/report',
    reportRateLimiter,
    validateRequest(reportEntrySchema),
    controller.reportEntry,
  );

  return router;
}

export default createEntriesRouter;
