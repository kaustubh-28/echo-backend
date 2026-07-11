import request from 'supertest';
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { UpdateEntryStatusDto } from '../src/modules/entries/entries.types';
import { ADMIN_COOKIE_NAME } from '../src/modules/admin/admin.constants';
import { EmailService } from '../src/modules/notifications/email.service';
import { DashboardService } from '../src/modules/admin/dashboard.service';

const mockEntryState = {
  id: '507f1f77bcf86cd799439011',
  submissionId: 'SUB-123',
  text: 'Spam text',
  category: 'wisdom',
  status: 'shadow_hidden',
  email: 'moderated-user@example.com',
  moderationReason: undefined as string | undefined,
  helpfulCount: 5,
  reportCount: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('../src/modules/entries/entries.model', () => {
  return {
    EntryModel: {
      findById: vi.fn().mockImplementation((id) => {
        if (id === mockEntryState.id) {
          return Promise.resolve({
            _id: mockEntryState.id,
            ...mockEntryState,
          });
        }
        return Promise.resolve(null);
      }),
      findByIdAndUpdate: vi.fn().mockImplementation((id, update) => {
        if (id === mockEntryState.id) {
          if (update.$set?.status) mockEntryState.status = update.$set.status;
          if (update.$set?.moderationReason !== undefined) {
            mockEntryState.moderationReason = update.$set.moderationReason;
          }
          return Promise.resolve({
            _id: mockEntryState.id,
            ...mockEntryState,
          });
        }
        return Promise.resolve(null);
      }),
      find: vi.fn().mockImplementation(() => Promise.resolve([{ _id: mockEntryState.id, ...mockEntryState }])),
      countDocuments: vi.fn().mockImplementation(() => Promise.resolve(1)),
    },
    default: {
      findById: vi.fn().mockImplementation((id) => {
        if (id === mockEntryState.id) {
          return Promise.resolve({
            _id: mockEntryState.id,
            ...mockEntryState,
          });
        }
        return Promise.resolve(null);
      }),
      findByIdAndUpdate: vi.fn().mockImplementation((id, update) => {
        if (id === mockEntryState.id) {
          if (update.$set?.status) mockEntryState.status = update.$set.status;
          if (update.$set?.moderationReason !== undefined) {
            mockEntryState.moderationReason = update.$set.moderationReason;
          }
          return Promise.resolve({
            _id: mockEntryState.id,
            ...mockEntryState,
          });
        }
        return Promise.resolve(null);
      }),
      find: vi.fn().mockImplementation(() => Promise.resolve([{ _id: mockEntryState.id, ...mockEntryState }])),
      countDocuments: vi.fn().mockImplementation(() => Promise.resolve(1)),
    },
  };
});

vi.mock('../src/modules/entries/report.model', () => {
  return {
    ReportModel: {
      find: vi.fn().mockImplementation(() => Promise.resolve([
        {
          _id: 'report-1',
          entryId: mockEntryState.id,
          reason: 'spam',
          createdAt: new Date(),
        }
      ])),
    },
    default: {
      find: vi.fn().mockImplementation(() => Promise.resolve([
        {
          _id: 'report-1',
          entryId: mockEntryState.id,
          reason: 'spam',
          createdAt: new Date(),
        }
      ])),
    },
  };
});

vi.mock('../src/modules/moderation/moderationLog.model', () => {
  return {
    ModerationLogModel: {
      find: vi.fn().mockImplementation(() => Promise.resolve([
        {
          entryId: mockEntryState.id,
          action: 'AUTO_HIDDEN',
          oldStatus: null,
          newStatus: 'shadow_hidden',
          reason: 'Spam pattern',
          performedBy: null,
          metadata: { confidence: 0.95, triggeredRules: ['spam_rule'] },
          createdAt: new Date(),
        }
      ])),
      create: vi.fn().mockImplementation(() => Promise.resolve({})),
    },
    default: {
      find: vi.fn().mockImplementation(() => Promise.resolve([
        {
          entryId: mockEntryState.id,
          action: 'AUTO_HIDDEN',
          oldStatus: null,
          newStatus: 'shadow_hidden',
          reason: 'Spam pattern',
          performedBy: null,
          metadata: { confidence: 0.95, triggeredRules: ['spam_rule'] },
          createdAt: new Date(),
        }
      ])),
      create: vi.fn().mockImplementation(() => Promise.resolve({})),
    },
  };
});

vi.mock('../src/modules/admin/admin.model', () => {
  return {
    AdminModel: {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue({}),
      findById: vi.fn().mockResolvedValue({}),
      findByIdAndUpdate: vi.fn().mockResolvedValue({}),
    },
    default: {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue({}),
      findById: vi.fn().mockResolvedValue({}),
      findByIdAndUpdate: vi.fn().mockResolvedValue({}),
    },
  };
});

const mockAdminState = {
  id: '507f1f77bcf86cd799439000',
  username: 'admin',
  passwordHash: '',
  isActive: true,
  failedLoginAttempts: 0,
  lockUntil: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('../src/middleware/rateLimit.middleware', () => {
  const passThrough = (req: any, res: any, next: any) => next();
  return {
    createRateLimiter: () => passThrough,
    createEntryRateLimiter: passThrough,
    helpfulRateLimiter: passThrough,
    reportRateLimiter: passThrough,
    adminLoginRateLimiter: passThrough,
  };
});

vi.mock('../src/modules/admin/admin.repository', () => {
  class MockedAdminRepository {
    async findByUsername(username: string) {
      if (username.toLowerCase() === 'admin') {
        if (!mockAdminState.passwordHash) {
          const b = await import('bcrypt');
          mockAdminState.passwordHash = await b.default.hash('admin1234', 10);
        }
        return { ...mockAdminState };
      }
      return null;
    }

    async findById(id: string) {
      if (id === '507f1f77bcf86cd799439000') {
        if (!mockAdminState.passwordHash) {
          const b = await import('bcrypt');
          mockAdminState.passwordHash = await b.default.hash('admin1234', 10);
        }
        return { ...mockAdminState };
      }
      return null;
    }

    async create(dto: { username: string; passwordHash: string }) {
      return {
        id: '507f1f77bcf86cd799439000',
        username: dto.username,
        isActive: true,
        failedLoginAttempts: 0,
        lockUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    async update(id: string, updateData: any) {
      Object.assign(mockAdminState, updateData);
      return { ...mockAdminState };
    }

    async incrementFailedAttempts(id: string, lockUntil?: Date) {
      mockAdminState.failedLoginAttempts += 1;
      if (lockUntil) {
        mockAdminState.lockUntil = lockUntil;
      }
      return { ...mockAdminState };
    }

    async resetFailedAttempts(_id: string) {
      mockAdminState.failedLoginAttempts = 0;
      mockAdminState.lockUntil = null;
      return { ...mockAdminState };
    }

    async updatePassword(_id: string, passwordHash: string) {
      mockAdminState.passwordHash = passwordHash;
      return { ...mockAdminState };
    }

    async updateLoginMetadata(_id: string, _lastLoginIp: string) {
      return { ...mockAdminState };
    }
  }
  return {
    AdminRepository: MockedAdminRepository,
    default: MockedAdminRepository,
  };
});

vi.mock('../src/modules/entries/report.repository', () => {
  class MockedReportRepository {
    async countTotal() {
      return 10;
    }
    async countCreatedSince(_date: Date) {
      return 3;
    }
  }
  return {
    ReportRepository: MockedReportRepository,
    default: MockedReportRepository,
  };
});

vi.mock('../src/modules/entries/helpful.repository', () => {
  class MockedHelpfulRepository {
    async countTotal() {
      return 5;
    }
  }
  return {
    HelpfulRepository: MockedHelpfulRepository,
    default: MockedHelpfulRepository,
  };
});

vi.mock('../src/modules/notifications/email.service', () => {
  class MockedConsoleEmailProvider {
    async sendEmail() {
      return Promise.resolve();
    }
  }
  class MockedEmailService {
    async sendSubmissionReceived(_to: string, _submissionId: string, _text: string) {
      return Promise.resolve();
    }
    async sendSubmissionApproved(_to: string, _submissionId: string) {
      return Promise.resolve();
    }
    async sendSubmissionRemoved(_to: string, _submissionId: string, _reason?: string) {
      return Promise.resolve();
    }
  }
  return {
    ConsoleEmailProvider: MockedConsoleEmailProvider,
    EmailService: MockedEmailService,
    default: MockedEmailService,
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

vi.mock('../src/modules/entries/entries.repository', () => {
  class MockedEntriesRepository {
    async findById(id: string) {
      if (id === mockEntryState.id) {
        return { ...mockEntryState };
      }
      return null;
    }

    async findShadowHidden() {
      return [{ ...mockEntryState }];
    }

    async findForQueue(_query: any) {
      return {
        entries: [{ ...mockEntryState }],
        total: 1
      };
    }

    async updateStatus(id: string, dto: UpdateEntryStatusDto) {
      if (id === mockEntryState.id) {
        mockEntryState.status = dto.status;
        mockEntryState.moderationReason = dto.moderationReason;
      }
      return { ...mockEntryState };
    }

    async getStatusCounts() {
      return {
        published: 20,
        shadow_hidden: 2,
        removed: 1,
      };
    }

    async countCreatedSince(_date: Date) {
      return 4;
    }
  }
  return {
    EntriesRepository: MockedEntriesRepository,
    default: MockedEntriesRepository,
  };
});

let app: any;

describe('Admin Authentication Routing', () => {
  beforeAll(async () => {
    const appModule = await import('../src/app');
    app = appModule.default;
  });
  beforeEach(async () => {
    const b = await import('bcrypt');
    mockAdminState.passwordHash = await b.default.hash('admin1234', 10);
    mockAdminState.failedLoginAttempts = 0;
    mockAdminState.lockUntil = null;
    mockAdminState.isActive = true;

    mockEntryState.status = 'shadow_hidden';
    mockEntryState.moderationReason = undefined;
  });

  it('POST /api/v1/admin/login should login successfully with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'admin1234' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.admin.username).toBe('admin');
    expect(response.body.data.token).toBeDefined();

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain(`${ADMIN_COOKIE_NAME}=`);
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Lax');
  });

  it('POST /api/v1/admin/login should return 401 for invalid password', async () => {
    const response = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/v1/admin/login should return 400 validation error for missing credentials', async () => {
    const response = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/admin/login should lock account after 5 failed login attempts', async () => {
    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/v1/admin/login')
        .send({ username: 'admin', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    // 5th failed attempt -> locks account
    const res5 = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res5.status).toBe(401);
    expect(mockAdminState.failedLoginAttempts).toBe(5);
    expect(mockAdminState.lockUntil).not.toBeNull();

    // 6th attempt -> returns ACCOUNT_LOCKED
    const res6 = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'admin1234' });
    expect(res6.status).toBe(403);
    expect(res6.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('POST /api/v1/admin/logout should clear the token cookie', async () => {
    const response = await request(app).post('/api/v1/admin/logout');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain(`${ADMIN_COOKIE_NAME}=;`);
  });

  it('GET /api/v1/admin/me should succeed with a valid JWT', async () => {
    const token = jwt.sign(
      { sub: '507f1f77bcf86cd799439000', username: 'admin', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const response = await request(app)
      .get('/api/v1/admin/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.username).toBe('admin');
  });

  it('GET /api/v1/admin/me should fail with an expired JWT', async () => {
    const token = jwt.sign(
      { sub: '507f1f77bcf86cd799439000', username: 'admin', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '-1h' },
    );

    const response = await request(app)
      .get('/api/v1/admin/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/admin/change-password should successfully change password and clear cookies', async () => {
    const token = jwt.sign(
      { sub: '507f1f77bcf86cd799439000', username: 'admin', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    const response = await request(app)
      .patch('/api/v1/admin/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'admin1234', newPassword: 'newsecurepassword123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain(`${ADMIN_COOKIE_NAME}=;`);

    // Verify login with old password fails
    const loginOld = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'admin1234' });
    expect(loginOld.status).toBe(401);

    // Verify login with new password succeeds
    const loginNew = await request(app)
      .post('/api/v1/admin/login')
      .send({ username: 'admin', password: 'newsecurepassword123' });
    expect(loginNew.status).toBe(200);
  });

  describe('Admin Queue & Moderation Actions', () => {
    const validToken = jwt.sign(
      { sub: '507f1f77bcf86cd799439000', username: 'admin', role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' },
    );

    it('GET /api/v1/admin/review-queue should return shadow-hidden entries', async () => {
      const response = await request(app)
        .get('/api/v1/admin/review-queue')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0].entry.status).toBe('shadow_hidden');
    });

    it('GET /api/v1/admin/review-queue should fail for authentication failure', async () => {
      const response = await request(app).get('/api/v1/admin/review-queue');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('PATCH /api/v1/admin/entries/:id/approve should transition shadow_hidden to published', async () => {
      const response = await request(app)
        .patch('/api/v1/admin/entries/507f1f77bcf86cd799439011/approve')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.entry.status).toBe('published');
    });

    it('PATCH /api/v1/admin/entries/:id/approve should transition shadow_hidden to published and trigger email', async () => {
      const spy = vi.spyOn(EmailService.prototype, 'sendSubmissionApproved');
      
      const response = await request(app)
        .patch('/api/v1/admin/entries/507f1f77bcf86cd799439011/approve')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.entry.status).toBe('published');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('moderated-user@example.com', 'SUB-123');

      spy.mockRestore();
    });

    it('PATCH /api/v1/admin/entries/:id/approve should still succeed even if email dispatch fails', async () => {
      const spy = vi.spyOn(EmailService.prototype, 'sendSubmissionApproved').mockRejectedValue(new Error('SMTP Offline'));
      
      const response = await request(app)
        .patch('/api/v1/admin/entries/507f1f77bcf86cd799439011/approve')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('PATCH /api/v1/admin/entries/:id/approve should return 404 if entry not found', async () => {
      const response = await request(app)
        .patch('/api/v1/admin/entries/507f1f77bcf86cd799439000/approve')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENTRY_NOT_FOUND');
    });

    it('PATCH /api/v1/admin/entries/:id/approve should fail for authentication failure', async () => {
      const response = await request(app).patch('/api/v1/admin/entries/507f1f77bcf86cd799439011/approve');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('PATCH /api/v1/admin/entries/:id/remove should transition status to removed with reason and trigger email', async () => {
      const spy = vi.spyOn(EmailService.prototype, 'sendSubmissionRemoved');
      
      const response = await request(app)
        .patch('/api/v1/admin/entries/507f1f77bcf86cd799439011/remove')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ reason: 'Violating community standards' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.entry.status).toBe('removed');
      expect(response.body.data.entry.moderationReason).toBe('Violating community standards');
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('moderated-user@example.com', 'SUB-123', 'Violating community standards');

      spy.mockRestore();
    });

    it('PATCH /api/v1/admin/entries/:id/remove should still succeed even if email dispatch fails', async () => {
      const spy = vi.spyOn(EmailService.prototype, 'sendSubmissionRemoved').mockRejectedValue(new Error('SMTP Offline'));
      
      const response = await request(app)
        .patch('/api/v1/admin/entries/507f1f77bcf86cd799439011/remove')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ reason: 'Violating community standards' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('PATCH /api/v1/admin/entries/:id/remove should return 400 validation error for overly long reason', async () => {
      const longReason = 'a'.repeat(501);
      const response = await request(app)
        .patch('/api/v1/admin/entries/507f1f77bcf86cd799439011/remove')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ reason: longReason });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PATCH /api/v1/admin/entries/:id/remove should fail for authentication failure', async () => {
      const response = await request(app).patch('/api/v1/admin/entries/507f1f77bcf86cd799439011/remove');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    describe('Admin Dashboard Stats', () => {
      it('GET /api/v1/admin/dashboard should retrieve dashboard stats correctly', async () => {
        const spy = vi.spyOn(DashboardService.prototype, 'getDashboardStats').mockResolvedValue({
          overview: { totalEntries: 23, published: 20, shadowHidden: 2, removed: 1 },
          moderation: { pendingReview: 2, approvalRate: 80, averageModerationTime: 120 },
          today: { submissionsToday: 4, reportsToday: 3 },
          activity: { totalHelpful: 5, totalReports: 10, oldestPendingSubmission: { submissionId: 'SUB-123', createdAt: new Date(), waitingDuration: 5000 } }
        });

        const response = await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.overview.totalEntries).toBe(23);
        expect(response.body.data.overview.published).toBe(20);
        expect(response.body.data.overview.shadowHidden).toBe(2);
        expect(response.body.data.overview.removed).toBe(1);
        expect(response.body.data.activity.totalReports).toBe(10);
        expect(response.body.data.activity.totalHelpful).toBe(5);
        expect(response.body.data.today.reportsToday).toBe(3);
        expect(response.body.data.today.submissionsToday).toBe(4);

        spy.mockRestore();
      });

      it('GET /api/v1/admin/dashboard should fail if token is missing', async () => {
        const response = await request(app).get('/api/v1/admin/dashboard');
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('GET /api/v1/admin/dashboard should handle empty database case correctly', async () => {
        const spy = vi.spyOn(DashboardService.prototype, 'getDashboardStats').mockResolvedValue({
          overview: { totalEntries: 0, published: 0, shadowHidden: 0, removed: 0 },
          moderation: { pendingReview: 0, approvalRate: 0, averageModerationTime: 0 },
          today: { submissionsToday: 0, reportsToday: 0 },
          activity: { totalHelpful: 0, totalReports: 0, oldestPendingSubmission: null }
        });

        const response = await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.overview.totalEntries).toBe(0);
        expect(response.body.data.overview.published).toBe(0);
        expect(response.body.data.overview.shadowHidden).toBe(0);
        expect(response.body.data.overview.removed).toBe(0);
        expect(response.body.data.activity.totalReports).toBe(0);
        expect(response.body.data.activity.totalHelpful).toBe(0);
        expect(response.body.data.today.reportsToday).toBe(0);
        expect(response.body.data.today.submissionsToday).toBe(0);

        spy.mockRestore();
      });
    });
  });
});
