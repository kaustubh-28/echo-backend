import { Request, Response, NextFunction } from 'express';
import { sendSuccessResponse } from '@shared/utils/response';
import { HealthService } from './health.service';

export class HealthController {
  constructor(private readonly healthService: HealthService) {
    this.getLive = this.getLive.bind(this);
    this.getReady = this.getReady.bind(this);
    this.getHealth = this.getHealth.bind(this);
  }

  /**
   * GET /health/live
   * Liveness probe — is the process running?
   */
  getLive(req: Request, res: Response, next: NextFunction): void {
    try {
      const result = this.healthService.getLiveness();
      sendSuccessResponse({ res, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /health/ready
   * Readiness probe — are dependencies healthy?
   */
  async getReady(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.healthService.getReadiness();
      const statusCode = result.status === 'ok' ? 200 : 503;
      sendSuccessResponse({ res, statusCode, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /health
   * Full health check.
   */
  async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.healthService.getHealth();
      const statusCode = result.status === 'ok' ? 200 : 503;
      sendSuccessResponse({ res, statusCode, data: result });
    } catch (error) {
      next(error);
    }
  }
}
