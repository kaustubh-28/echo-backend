import { Router } from 'express';
import { getConfig } from './config.controller';

export function createConfigRouter(): Router {
  const router = Router();
  router.get('/config', getConfig);
  return router;
}
