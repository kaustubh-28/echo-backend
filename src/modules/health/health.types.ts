export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'connecting' | 'disconnecting';
  responseTimeMs?: number;
}

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  version: string;
  nodeVersion: string;
  database: DatabaseHealth;
  environment: string;
  timestamp: string;
}

export interface LivenessResult {
  status: 'ok';
  uptime: number;
  timestamp: string;
}
