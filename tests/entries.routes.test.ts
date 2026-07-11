import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import app from '../src/app';
import { EntriesRepository } from '../src/modules/entries/entries.repository';
import { HelpfulRepository } from '../src/modules/entries/helpful.repository';
import { EmailService } from '../src/modules/notifications/email.service';
import { ModerationWorkflow } from '../src/modules/moderation/moderation.workflow';

// Mock the HelpfulRepository using a constructor class
vi.mock('../src/modules/entries/helpful.repository', () => {
  class MockedHelpfulRepository {
    create(_dto: { entryId: string; visitorHash: string }) {
      return Promise.resolve(true);
    }
    exists(_entryId: string, _visitorHash: string) {
      return Promise.resolve(false);
    }
    delete(_entryId: string, _visitorHash: string) {
      return Promise.resolve(true);
    }
  }
  return {
    HelpfulRepository: MockedHelpfulRepository,
    default: MockedHelpfulRepository,
  };
});

import { ReportRepository } from '../src/modules/entries/report.repository';
import { ReportReason } from '../src/modules/entries/entries.constants';

vi.mock('../src/modules/entries/report.repository', () => {
  class MockedReportRepository {
    create(_dto: { entryId: string; visitorHash: string; reason: ReportReason }) {
      return Promise.resolve(true);
    }
    exists(_entryId: string, _visitorHash: string) {
      return Promise.resolve(false);
    }
    count(_entryId: string) {
      return Promise.resolve(0);
    }
  }
  return {
    ReportRepository: MockedReportRepository,
    default: MockedReportRepository,
  };
});
vi.mock('../src/modules/moderation/moderation.service', () => {
  class MockedModerationService {
    evaluateSubmission(_text: string) {
      return Promise.resolve({ decision: 'APPROVED' });
    }
  }
  return {
    ModerationService: MockedModerationService,
    default: MockedModerationService,
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

let mockCreatedEntryText = 'To be or not to be.';
let mockCreatedEntryEmail = undefined as string | undefined;

vi.mock('../src/modules/entries/entries.model', () => {
  return {
    EntryModel: {
      findByIdAndUpdate: vi.fn().mockImplementation((id, update) => {
        return Promise.resolve({
          _id: id,
          submissionId: 'SUB-123',
          text: mockCreatedEntryText,
          author: 'Hamlet',
          source: 'Shakespeare',
          category: 'quote',
          status: update.$set?.status || 'published',
          email: mockCreatedEntryEmail,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      findOne: vi.fn().mockResolvedValue(null),
    },
    default: {
      findByIdAndUpdate: vi.fn().mockImplementation((id, update) => {
        return Promise.resolve({
          _id: id,
          submissionId: 'SUB-123',
          text: mockCreatedEntryText,
          author: 'Hamlet',
          source: 'Shakespeare',
          category: 'quote',
          status: update.$set?.status || 'published',
          email: mockCreatedEntryEmail,
          helpfulCount: 0,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      findOne: vi.fn().mockResolvedValue(null),
    },
  };
});

vi.mock('../src/modules/moderation/moderationLog.model', () => {
  return {
    ModerationLogModel: {
      create: vi.fn().mockResolvedValue({}),
    },
    default: {
      create: vi.fn().mockResolvedValue({}),
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

// Mock the EntriesRepository using a constructor class compatible with Mongoose bindings
vi.mock('../src/modules/entries/entries.repository', () => {
  const mockEntries = [
    {
      id: 'mocked-id-1',
      submissionId: 'SUB-1',
      text: 'To be or not to be.',
      author: 'Hamlet',
      source: 'Shakespeare',
      category: 'quote',
      status: 'published',
      helpfulCount: 0,
      reportCount: 0,
      createdAt: new Date('2026-07-03T10:00:00Z'),
      updatedAt: new Date('2026-07-03T10:00:00Z'),
    },
    {
      id: 'mocked-id-2',
      submissionId: 'SUB-2',
      text: 'Seek wisdom, not answers.',
      category: 'wisdom',
      status: 'published',
      helpfulCount: 0,
      reportCount: 0,
      createdAt: new Date('2026-07-02T10:00:00Z'),
      updatedAt: new Date('2026-07-02T10:00:00Z'),
    },
    {
      id: 'mocked-id-3',
      submissionId: 'SUB-3',
      text: 'Good advice is rare.',
      category: 'advice',
      status: 'published',
      helpfulCount: 0,
      reportCount: 0,
      createdAt: new Date('2026-07-01T10:00:00Z'),
      updatedAt: new Date('2026-07-01T10:00:00Z'),
    },
  ];

  class MockedEntriesRepository {
    async create(dto: any) {
      mockCreatedEntryText = dto.text;
      mockCreatedEntryEmail = dto.email;
      return Promise.resolve({
        id: '507f1f77bcf86cd799439019',
        ...dto,
        status: 'published',
        helpfulCount: 0,
        reportCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    async findById(_id: string) {
      return Promise.resolve(null);
    }
    async findBySubmissionId(submissionId: string) {
      if (submissionId === 'ECH-VALD-SUBS') {
        return Promise.resolve({
          id: 'mocked-id-123',
          submissionId: 'ECH-VALD-SUBS',
          text: 'Mocked entry',
          category: 'wisdom',
          status: 'published',
          helpfulCount: 5,
          reportCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      return Promise.resolve(null);
    }
    async findPublished(query: any) {
      const { category, page = 1, limit = 10 } = query;
      let filtered = [...mockEntries];
      if (category) {
        filtered = filtered.filter((e) => e.category === category);
      }
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const skip = (page - 1) * limit;
      return Promise.resolve(filtered.slice(skip, skip + limit));
    }
    async countPublished(category?: string) {
      let filtered = [...mockEntries];
      if (category) {
        filtered = filtered.filter((e) => e.category === category);
      }
      return Promise.resolve(filtered.length);
    }
    async findRandom(limit: number) {
      return Promise.resolve(mockEntries.slice(0, limit));
    }
    async search(query: any) {
      const { q, category, page = 1, limit = 10 } = query;
      let filtered = [...mockEntries];
      if (q) {
        const queryTerm = q.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.text.toLowerCase().includes(queryTerm) ||
            e.submissionId.toLowerCase().includes(queryTerm) ||
            (e.author && e.author.toLowerCase().includes(queryTerm)) ||
            (e.source && e.source.toLowerCase().includes(queryTerm)),
        );
      }
      if (category) {
        filtered = filtered.filter((e) => e.category === category);
      }
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const skip = (page - 1) * limit;
      return Promise.resolve(filtered.slice(skip, skip + limit));
    }
    async countSearch(query: any) {
      const { q, category } = query;
      let filtered = [...mockEntries];
      if (q) {
        const queryTerm = q.toLowerCase();
        filtered = filtered.filter(
          (e) =>
            e.text.toLowerCase().includes(queryTerm) ||
            e.submissionId.toLowerCase().includes(queryTerm) ||
            (e.author && e.author.toLowerCase().includes(queryTerm)) ||
            (e.source && e.source.toLowerCase().includes(queryTerm)),
        );
      }
      if (category) {
        filtered = filtered.filter((e) => e.category === category);
      }
      return Promise.resolve(filtered.length);
    }
    async updateStatus(_id: string, _dto: any) {
      return Promise.resolve(null);
    }
    async incrementHelpfulCount(_id: string) {
      return Promise.resolve(null);
    }
    async decrementHelpfulCount(_id: string) {
      return Promise.resolve(null);
    }
    async incrementReportCount(_id: string) {
      return Promise.resolve(null);
    }
    async decrementReportCount(_id: string) {
      return Promise.resolve(null);
    }
    async autoHideEntry(_id: string) {
      return Promise.resolve(null);
    }
  }

  return {
    EntriesRepository: MockedEntriesRepository,
    default: MockedEntriesRepository,
  };
});

describe('Entries Routing Skeleton', () => {
  it('POST /api/v1/entries should validate payload and return 201 on success', async () => {
    const payload = {
      text: 'To be or not to be.',
      author: 'Hamlet',
      source: 'Shakespeare',
      category: 'quote',
    };

    const response = await request(app).post('/api/v1/entries').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        id: '507f1f77bcf86cd799439019',
        text: payload.text,
        category: payload.category,
        submissionId: expect.any(String),
      }),
      meta: {},
      error: null,
    });
    expect(response.body.data.visitorHash).toBeUndefined();
  });

  it('POST /api/v1/entries should persist visitorHash internally', async () => {
    const createSpy = vi.spyOn(EntriesRepository.prototype, 'create');

    const response = await request(app)
      .post('/api/v1/entries')
      .send({ text: 'Persist visitor hash.', category: 'quote' });

    expect(response.status).toBe(201);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ visitorHash: 'mock-visitor-hash' }),
    );

    createSpy.mockRestore();
  });

  it('POST /api/v1/entries should return 400 when missing required validation fields', async () => {
    const response = await request(app).post('/api/v1/entries').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      data: null,
      meta: {},
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: expect.any(Array),
      },
    });
  });

  describe('POST /api/v1/entries - Email Notifications', () => {
    it('should queue email when email is provided', async () => {
      const spy = vi.spyOn(EmailService.prototype, 'sendSubmissionReceived');
      
      const payload = {
        text: 'This submission has email.',
        category: 'quote',
        email: 'user@example.com',
      };

      const response = await request(app).post('/api/v1/entries').send(payload);

      expect(response.status).toBe(201);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('user@example.com', expect.any(String), 'This submission has email.');
      
      spy.mockRestore();
    });

    it('should not send email when email is not provided', async () => {
      const spy = vi.spyOn(EmailService.prototype, 'sendSubmissionReceived');
      
      const payload = {
        text: 'This submission does not have email.',
        category: 'quote',
      };

      const response = await request(app).post('/api/v1/entries').send(payload);

      expect(response.status).toBe(201);
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('should still succeed with 201 even if the email provider throws an error', async () => {
      const spy = vi.spyOn(EmailService.prototype, 'sendSubmissionReceived').mockRejectedValue(new Error('SMTP connection timed out'));
      
      const payload = {
        text: 'This submission has an email but provider fails.',
        category: 'quote',
        email: 'user@example.com',
      };

      const response = await request(app).post('/api/v1/entries').send(payload);

      expect(response.status).toBe(201);
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });
  });

  it('GET /api/v1/entries should return 200 and a list of entries with default pagination', async () => {
    const response = await request(app).get('/api/v1/entries');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-1', category: 'quote' }),
        expect.objectContaining({ id: 'mocked-id-2', category: 'wisdom' }),
        expect.objectContaining({ id: 'mocked-id-3', category: 'advice' }),
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries should return 200 and a custom page of entries', async () => {
    const response = await request(app).get('/api/v1/entries?page=2&limit=2');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-3', category: 'advice' }),
      ],
      meta: {
        page: 2,
        limit: 2,
        total: 3,
        totalPages: 2,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries should return 200 and respect custom limit', async () => {
    const response = await request(app).get('/api/v1/entries?limit=1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-1', category: 'quote' }),
      ],
      meta: {
        page: 1,
        limit: 1,
        total: 3,
        totalPages: 3,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries should return 200 and filter by category', async () => {
    const response = await request(app).get('/api/v1/entries?category=wisdom');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-2', category: 'wisdom' }),
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries should return 200 and empty list if no entries match category', async () => {
    const response = await request(app).get('/api/v1/entries?category=life');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries should return 400 for invalid page parameter', async () => {
    const response = await request(app).get('/api/v1/entries?page=0');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/entries should return 400 for invalid limit parameter (too large)', async () => {
    const response = await request(app).get('/api/v1/entries?limit=101');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/entries should return 400 for invalid category', async () => {
    const response = await request(app).get('/api/v1/entries?category=invalid');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/entries/search should return 200 and search results', async () => {
    const response = await request(app).get('/api/v1/entries/search?q=wisdom');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-2', text: 'Seek wisdom, not answers.' }),
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries/search should match submissionId field', async () => {
    const response = await request(app).get('/api/v1/entries/search?q=SUB-1');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-1', submissionId: 'SUB-1' }),
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries/search should match author/source fields', async () => {
    const response = await request(app).get('/api/v1/entries/search?q=Shakespeare');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-1', source: 'Shakespeare' }),
      ],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries/search should return 200 and empty list if no matches', async () => {
    const response = await request(app).get('/api/v1/entries/search?q=nonexistent');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
      error: null,
    });
  });

  it('GET /api/v1/entries/search should filter by category', async () => {
    const response = await request(app).get('/api/v1/entries/search?q=be&category=quote');
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.meta.total).toBe(1);

    const responseNoMatchCategory = await request(app).get('/api/v1/entries/search?q=be&category=wisdom');
    expect(responseNoMatchCategory.status).toBe(200);
    expect(responseNoMatchCategory.body.data.length).toBe(0);
    expect(responseNoMatchCategory.body.meta.total).toBe(0);
  });

  it('GET /api/v1/entries/search should support pagination params', async () => {
    const response = await request(app).get('/api/v1/entries/search?q=e&page=2&limit=2');
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('GET /api/v1/entries/search should return 400 when search query string is missing', async () => {
    const response = await request(app).get('/api/v1/entries/search');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/entries/search should return 400 when search query string is blank', async () => {
    const response = await request(app).get('/api/v1/entries/search?q=   ');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/entries/search should return 400 when search query string is empty', async () => {
    const response = await request(app).get('/api/v1/entries/search?q=');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/entries/random should return 200 and a single entry by default', async () => {
    const response = await request(app).get('/api/v1/entries/random');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({ id: 'mocked-id-1' }),
      meta: {},
      error: null,
    });
  });

  it('GET /api/v1/entries/random should return 200 and respect custom limit > 1', async () => {
    const response = await request(app).get('/api/v1/entries/random?limit=2');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-1' }),
        expect.objectContaining({ id: 'mocked-id-2' }),
      ],
      meta: {},
      error: null,
    });
  });

  it('GET /api/v1/entries/random should return 200 and null/empty array if database is empty', async () => {
    const spy = vi.spyOn(EntriesRepository.prototype, 'findRandom').mockResolvedValue([]);

    const responseSingle = await request(app).get('/api/v1/entries/random?limit=1');
    expect(responseSingle.status).toBe(200);
    expect(responseSingle.body.data).toBeNull();

    const responseArray = await request(app).get('/api/v1/entries/random?limit=3');
    expect(responseArray.status).toBe(200);
    expect(responseArray.body.data).toEqual([]);

    spy.mockRestore();
  });

  it('GET /api/v1/entries/random should return 200 and return all available entries if limit exceeds count', async () => {
    const response = await request(app).get('/api/v1/entries/random?limit=10');
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(3);
    expect(response.body).toEqual({
      success: true,
      data: [
        expect.objectContaining({ id: 'mocked-id-1' }),
        expect.objectContaining({ id: 'mocked-id-2' }),
        expect.objectContaining({ id: 'mocked-id-3' }),
      ],
      meta: {},
      error: null,
    });
  });

  it('GET /api/v1/entries/random should return 400 for invalid limits', async () => {
    const responseMin = await request(app).get('/api/v1/entries/random?limit=0');
    expect(responseMin.status).toBe(400);
    expect(responseMin.body.success).toBe(false);
    expect(responseMin.body.error.code).toBe('VALIDATION_ERROR');

    const responseMax = await request(app).get('/api/v1/entries/random?limit=11');
    expect(responseMax.status).toBe(400);
    expect(responseMax.body.success).toBe(false);
    expect(responseMax.body.error.code).toBe('VALIDATION_ERROR');

    const responseType = await request(app).get('/api/v1/entries/random?limit=abc');
    expect(responseType.status).toBe(400);
    expect(responseType.body.success).toBe(false);
    expect(responseType.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/entries/daily should return 200', async () => {
    const response = await request(app).get('/api/v1/entries/daily');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({ id: 'mocked-id-1' }),
      meta: {},
      error: null,
    });
  });

  it('GET /api/v1/entries/daily should return 200 and null if database is empty', async () => {
    const spy = vi.spyOn(EntriesRepository.prototype, 'findRandom').mockResolvedValue([]);
    const response = await request(app).get('/api/v1/entries/daily');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: null,
      meta: {},
      error: null,
    });
    spy.mockRestore();
  });

  it('GET /api/v1/entries/status/:submissionId should return status details on success and omit internal fields', async () => {
    const response = await request(app).get('/api/v1/entries/status/ECH-VALD-SUBS');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        submissionId: 'ECH-VALD-SUBS',
        status: 'published',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
      meta: {},
      error: null,
    });
    expect(response.body.data.id).toBeUndefined();
    expect(response.body.data._id).toBeUndefined();
    expect(response.body.data.email).toBeUndefined();
    expect(response.body.data.visitorHash).toBeUndefined();
    expect(response.body.data.moderationReason).toBeUndefined();
  });

  it('GET /api/v1/entries/status/:submissionId should return 404 if not found (with valid submissionId)', async () => {
    const response = await request(app).get('/api/v1/entries/status/ECH-MISS-INGS');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      data: null,
      meta: {},
      error: {
        code: 'ENTRY_NOT_FOUND',
        message: 'Entry with submission ID ECH-MISS-INGS not found',
      },
    });
  });

  it('GET /api/v1/entries/status/:submissionId should return 400 if submissionId is malformed', async () => {
    const response = await request(app).get('/api/v1/entries/status/INVALID-SUB');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/status/:submissionId should redirect to /api/v1/entries/status/:submissionId', async () => {
    const response = await request(app).get('/api/v1/status/ECH-VALD-SUBS');
    expect(response.status).toBe(301);
    expect(response.headers.location).toBe('/api/v1/entries/status/ECH-VALD-SUBS');
  });

  describe('POST /api/v1/entries/:id/helpful', () => {
    const validEntryId = '507f1f77bcf86cd799439011';

    it('should successfully mark entry as helpful and increment counter', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue({
        id: validEntryId,
        submissionId: 'SUB-1',
        text: 'Hello',
        category: 'wisdom',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Entry);

      const incSpy = vi.spyOn(EntriesRepository.prototype, 'incrementHelpfulCount').mockResolvedValue({
        helpfulCount: 1,
      } as unknown as Entry);
      const existsSpy = vi.spyOn(HelpfulRepository.prototype, 'exists').mockResolvedValue(false);
      const createSpy = vi.spyOn(HelpfulRepository.prototype, 'create').mockResolvedValue(true);

      const response = await request(app).post(`/api/v1/entries/${validEntryId}/helpful`);
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: { helpfulCount: 1, viewerHasMarkedHelpful: true },
        meta: {},
        error: null,
      });

      expect(existsSpy).toHaveBeenCalledWith(validEntryId, 'mock-visitor-hash');
      expect(createSpy).toHaveBeenCalledWith({ entryId: validEntryId, visitorHash: 'mock-visitor-hash' });
      expect(incSpy).toHaveBeenCalledWith(validEntryId);

      entrySpy.mockRestore();
      incSpy.mockRestore();
      existsSpy.mockRestore();
      createSpy.mockRestore();
    });

    it('should successfully toggle/remove helpful vote if already marked helpful', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue({
        id: validEntryId,
        submissionId: 'SUB-1',
        text: 'Hello',
        category: 'wisdom',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Entry);

      const decSpy = vi.spyOn(EntriesRepository.prototype, 'decrementHelpfulCount').mockResolvedValue({
        helpfulCount: 0,
      } as unknown as Entry);
      const existsSpy = vi.spyOn(HelpfulRepository.prototype, 'exists').mockResolvedValue(true);
      const deleteSpy = vi.spyOn(HelpfulRepository.prototype, 'delete').mockResolvedValue(true);

      const response = await request(app).post(`/api/v1/entries/${validEntryId}/helpful`);
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: { helpfulCount: 0, viewerHasMarkedHelpful: false },
        meta: {},
        error: null,
      });

      expect(existsSpy).toHaveBeenCalledWith(validEntryId, 'mock-visitor-hash');
      expect(deleteSpy).toHaveBeenCalledWith(validEntryId, 'mock-visitor-hash');
      expect(decSpy).toHaveBeenCalledWith(validEntryId);

      entrySpy.mockRestore();
      decSpy.mockRestore();
      existsSpy.mockRestore();
      deleteSpy.mockRestore();
    });

    it('should return 404 if entry does not exist', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue(null);

      const response = await request(app).post(`/api/v1/entries/${validEntryId}/helpful`);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENTRY_NOT_FOUND');

      entrySpy.mockRestore();
    });

    it('should return 404 if entry is not published (e.g. removed or shadow_hidden)', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue({
        id: validEntryId,
        submissionId: 'SUB-1',
        text: 'Hello',
        category: 'wisdom',
        status: 'removed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Entry);

      const response = await request(app).post(`/api/v1/entries/${validEntryId}/helpful`);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENTRY_NOT_FOUND');

      entrySpy.mockRestore();
    });

    it('should return 400 validation error if entry ID is malformed', async () => {
      const response = await request(app).post('/api/v1/entries/invalid-id/helpful');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/entries/:id/report', () => {
    const validEntryId = '507f1f77bcf86cd799439011';

    it('should successfully report entry, increment counter, and not auto-hide if threshold not reached', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue({
        id: validEntryId,
        submissionId: 'SUB-1',
        text: 'Hello',
        category: 'wisdom',
        status: 'published',
        reportCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Entry);

      const incSpy = vi.spyOn(EntriesRepository.prototype, 'incrementReportCount').mockResolvedValue({
        id: validEntryId,
        status: 'published',
        reportCount: 1,
      } as unknown as Entry);

      const existsSpy = vi.spyOn(ReportRepository.prototype, 'exists').mockResolvedValue(false);
      const createSpy = vi.spyOn(ReportRepository.prototype, 'create').mockResolvedValue(true);
      const autoHideSpy = vi.spyOn(EntriesRepository.prototype, 'autoHideEntry').mockResolvedValue({} as unknown as Entry);

      const response = await request(app)
        .post(`/api/v1/entries/${validEntryId}/report`)
        .send({ reason: 'spam' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: { success: true },
        meta: {},
        error: null,
      });

      expect(existsSpy).toHaveBeenCalledWith(validEntryId, 'mock-visitor-hash');
      expect(createSpy).toHaveBeenCalledWith({
        entryId: validEntryId,
        visitorHash: 'mock-visitor-hash',
        reason: 'spam',
      });
      expect(incSpy).toHaveBeenCalledWith(validEntryId);
      expect(autoHideSpy).not.toHaveBeenCalled();

      entrySpy.mockRestore();
      incSpy.mockRestore();
      existsSpy.mockRestore();
      createSpy.mockRestore();
      autoHideSpy.mockRestore();
    });

    it('should automatically shadow hide the entry when report threshold is reached', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue({
        id: validEntryId,
        submissionId: 'SUB-123',
        text: 'Some user submission text.',
        category: 'quote',
        status: 'published',
        reportCount: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Entry);

      const incSpy = vi.spyOn(EntriesRepository.prototype, 'incrementReportCount').mockResolvedValue({
        id: validEntryId,
        status: 'published',
        reportCount: 5,
      } as unknown as Entry);

      const existsSpy = vi.spyOn(ReportRepository.prototype, 'exists').mockResolvedValue(false);
      const createSpy = vi.spyOn(ReportRepository.prototype, 'create').mockResolvedValue(true);
      const workflowSpy = vi.spyOn(ModerationWorkflow.prototype, 'reportThreshold').mockResolvedValue({
        id: validEntryId,
        status: 'shadow_hidden',
      } as unknown as Entry);

      const response = await request(app)
        .post(`/api/v1/entries/${validEntryId}/report`)
        .send({ reason: 'spam' });

      expect(response.status).toBe(201);
      expect(incSpy).toHaveBeenCalledWith(validEntryId);
      expect(workflowSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: validEntryId }),
        'Report threshold reached'
      );

      entrySpy.mockRestore();
      incSpy.mockRestore();
      existsSpy.mockRestore();
      createSpy.mockRestore();
      workflowSpy.mockRestore();
    });

    it('should return 409 Conflict on duplicate reports from same visitor', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue({
        id: validEntryId,
        submissionId: 'SUB-1',
        text: 'Hello',
        category: 'wisdom',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Entry);

      const existsSpy = vi.spyOn(ReportRepository.prototype, 'exists').mockResolvedValue(true);

      const response = await request(app)
        .post(`/api/v1/entries/${validEntryId}/report`)
        .send({ reason: 'spam' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');

      entrySpy.mockRestore();
      existsSpy.mockRestore();
    });

    it('should return 404 if entry does not exist', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/entries/${validEntryId}/report`)
        .send({ reason: 'spam' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENTRY_NOT_FOUND');

      entrySpy.mockRestore();
    });

    it('should return 404 if entry status is removed', async () => {
      const entrySpy = vi.spyOn(EntriesRepository.prototype, 'findById').mockResolvedValue({
        id: validEntryId,
        submissionId: 'SUB-1',
        text: 'Hello',
        category: 'wisdom',
        status: 'removed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Entry);

      const response = await request(app)
        .post(`/api/v1/entries/${validEntryId}/report`)
        .send({ reason: 'spam' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENTRY_NOT_FOUND');

      entrySpy.mockRestore();
    });

    it('should return 400 validation error if reason body parameter is missing or invalid', async () => {
      const res1 = await request(app)
        .post(`/api/v1/entries/${validEntryId}/report`)
        .send({});
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('VALIDATION_ERROR');

      const res2 = await request(app)
        .post(`/api/v1/entries/${validEntryId}/report`)
        .send({ reason: 'invalid_reason_key' });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 validation error if entry ID is malformed', async () => {
      const response = await request(app)
        .post('/api/v1/entries/invalid-id/report')
        .send({ reason: 'spam' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
