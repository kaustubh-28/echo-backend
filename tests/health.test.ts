import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/modules/entries/entries.repository', () => {
  return {
    EntriesRepository: class {
      async findById() {}
      async findBySubmissionId() {}
      async create() {}
      async findPublished() {}
      async searchPublished() {}
      async findRandomPublished() {}
      async findDailyEntry() {}
      async getStatusCounts() {}
      async countCreatedSince() {}
      async updateStatus() {}
    },
  };
});

vi.mock('../src/modules/entries/helpful.repository', () => {
  return {
    HelpfulRepository: class {
      async findByEntryAndFingerprint() {}
      async create() {}
      async countTotal() {}
    },
  };
});

vi.mock('../src/modules/entries/report.repository', () => {
  return {
    ReportRepository: class {
      async findByEntryAndFingerprint() {}
      async create() {}
      async countTotal() {}
      async countCreatedSince() {}
    },
  };
});

vi.mock('../src/modules/moderation/moderation.service', () => {
  return {
    ModerationService: class {
      async evaluateSubmission() {
        return { decision: 'APPROVED', reason: null };
      }
    },
  };
});

vi.mock('../src/modules/notifications/email.service', () => {
  return {
    ConsoleEmailProvider: class {
      async send() {}
    },
    EmailService: class {
      async sendSubmissionReceived() {}
      async sendSubmissionApproved() {}
      async sendSubmissionRemoved() {}
    },
  };
});

vi.mock('../src/shared/services/visitor.service', () => {
  class MockedVisitorService {
    resolve(_req: unknown) {
      return {
        visitorId: 'mock-visitor-id',
        visitorHash: 'mock-visitor-hash',
        isNewVisitor: false,
      };
    }
  }
  return {
    VisitorService: MockedVisitorService,
    default: MockedVisitorService,
  };
});

vi.mock('../src/modules/admin/admin.repository', () => {
  return {
    AdminRepository: class {
      async findByUsername() {}
      async createAdmin() {}
    },
  };
});

// Mock the health service to control test scenarios
vi.mock('../src/modules/health/health.service', () => {
  return {
    HealthService: class {
      getLiveness() {
        return {
          status: 'ok',
          uptime: 123.456,
          timestamp: '2026-01-01T00:00:00.000Z',
        };
      }

      async getReadiness() {
        return (HealthService as any)._readinessResult || {
          status: 'ok',
          uptime: 123.456,
          memory: { rss: 50000000, heapUsed: 20000000, heapTotal: 40000000 },
          version: '1.0.0',
          nodeVersion: process.version,
          database: { status: 'connected', responseTimeMs: 5 },
          environment: 'test',
          timestamp: '2026-01-01T00:00:00.000Z',
        };
      }

      async getHealth() {
        return this.getReadiness();
      }
    },
  };
});

// Grab the mocked class so we can control per-test behavior
import { HealthService } from '../src/modules/health/health.service';
import app from '../src/app';

describe('Health Endpoints', () => {
  beforeEach(() => {
    // Reset to healthy by default
    (HealthService as any)._readinessResult = undefined;
  });

  // --------------------------------------------------
  // GET /api/v1/health/live
  // --------------------------------------------------
  describe('GET /api/v1/health/live', () => {
    it('should return 200 with liveness data', async () => {
      const res = await request(app).get('/api/v1/health/live');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        status: 'ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String),
      });
    });
  });

  // --------------------------------------------------
  // GET /api/v1/health/ready
  // --------------------------------------------------
  describe('GET /api/v1/health/ready', () => {
    it('should return 200 when all dependencies are healthy', async () => {
      const res = await request(app).get('/api/v1/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database).toEqual({
        status: 'connected',
        responseTimeMs: expect.any(Number),
      });
      expect(res.body.data.memory).toBeDefined();
      expect(res.body.data.version).toBeDefined();
      expect(res.body.data.nodeVersion).toBeDefined();
    });

    it('should return 503 when Mongo is disconnected', async () => {
      (HealthService as any)._readinessResult = {
        status: 'degraded',
        uptime: 123.456,
        memory: { rss: 50000000, heapUsed: 20000000, heapTotal: 40000000 },
        version: '1.0.0',
        nodeVersion: process.version,
        database: { status: 'disconnected' },
        environment: 'test',
        timestamp: '2026-01-01T00:00:00.000Z',
      };

      const res = await request(app).get('/api/v1/health/ready');

      expect(res.status).toBe(503);
      expect(res.body.data.status).toBe('degraded');
      expect(res.body.data.database.status).toBe('disconnected');
    });

    it('should return consistent response shape for partial failure', async () => {
      (HealthService as any)._readinessResult = {
        status: 'degraded',
        uptime: 50,
        memory: { rss: 10000000, heapUsed: 5000000, heapTotal: 8000000 },
        version: '1.0.0',
        nodeVersion: process.version,
        database: { status: 'connecting' },
        environment: 'test',
        timestamp: '2026-01-01T00:00:00.000Z',
      };

      const res = await request(app).get('/api/v1/health/ready');

      expect(res.status).toBe(503);
      // Verify response shape consistency
      const data = res.body.data;
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('nodeVersion');
      expect(data).toHaveProperty('database');
      expect(data).toHaveProperty('environment');
      expect(data).toHaveProperty('timestamp');
    });
  });

  // --------------------------------------------------
  // GET /api/v1/health
  // --------------------------------------------------
  describe('GET /api/v1/health', () => {
    it('should return 200 with full health data when healthy', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.status).toBe('ok');
      expect(data.uptime).toEqual(expect.any(Number));
      expect(data.memory).toEqual({
        rss: expect.any(Number),
        heapUsed: expect.any(Number),
        heapTotal: expect.any(Number),
      });
      expect(data.version).toEqual(expect.any(String));
      expect(data.nodeVersion).toEqual(expect.any(String));
      expect(data.database).toBeDefined();
      expect(data.environment).toBe('test');
      expect(data.timestamp).toEqual(expect.any(String));
    });

    it('should return 503 when database is down', async () => {
      (HealthService as any)._readinessResult = {
        status: 'degraded',
        uptime: 99,
        memory: { rss: 50000000, heapUsed: 20000000, heapTotal: 40000000 },
        version: '1.0.0',
        nodeVersion: process.version,
        database: { status: 'disconnected' },
        environment: 'test',
        timestamp: '2026-01-01T00:00:00.000Z',
      };

      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(503);
      expect(res.body.data.status).toBe('degraded');
    });

    it('should have consistent response shape across healthy and degraded states', async () => {
      // Healthy
      const healthyRes = await request(app).get('/api/v1/health');
      const healthyKeys = Object.keys(healthyRes.body.data).sort();

      // Degraded
      (HealthService as any)._readinessResult = {
        status: 'degraded',
        uptime: 10,
        memory: { rss: 10000000, heapUsed: 5000000, heapTotal: 8000000 },
        version: '1.0.0',
        nodeVersion: process.version,
        database: { status: 'disconnected' },
        environment: 'test',
        timestamp: '2026-01-01T00:00:00.000Z',
      };

      const degradedRes = await request(app).get('/api/v1/health');
      const degradedKeys = Object.keys(degradedRes.body.data).sort();

      expect(healthyKeys).toEqual(degradedKeys);
    });
  });
});
