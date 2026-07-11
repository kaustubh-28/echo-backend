import { checkDatabaseHealth } from '@database/index';
import { env } from '@config/env';
import { HealthCheckResult, LivenessResult, DatabaseHealth } from './health.types';

// Read version once at module load
// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require('../../../package.json');
const APP_VERSION: string = packageJson.version || '0.0.0';

export class HealthService {
  /**
   * Liveness probe — always returns ok if the process is running.
   * Used by orchestrators (e.g. Kubernetes) to determine if the process should be restarted.
   */
  getLiveness(): LivenessResult {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe — checks that all critical dependencies are healthy.
   * Returns 503 status data when any dependency is unhealthy.
   */
  async getReadiness(): Promise<HealthCheckResult> {
    const database = await this.checkDatabase();
    const envLoaded = this.checkEnvironment();

    const allHealthy = database.status === 'connected' && envLoaded;

    const mem = process.memoryUsage();

    return {
      status: allHealthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      memory: {
        rss: mem.rss,
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
      version: APP_VERSION,
      nodeVersion: process.version,
      database,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Full health check — comprehensive status of all components.
   */
  async getHealth(): Promise<HealthCheckResult> {
    return this.getReadiness();
  }

  /**
   * Ping MongoDB with a lightweight admin command and measure response time.
   */
  private async checkDatabase(): Promise<DatabaseHealth> {
    return checkDatabaseHealth();
  }

  /**
   * Simple check that env was parsed successfully.
   */
  private checkEnvironment(): boolean {
    return !!env.NODE_ENV;
  }
}
