import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import app from '../src/app';

// Mock Mongoose model methods to avoid real db dependency in tests
vi.mock('../src/modules/config/config.model', () => {
  const mockFind = vi.fn().mockResolvedValue([
    { key: 'entryCategories', value: ['advice', 'wisdom'] },
    { key: 'reportReasons', value: ['spam', 'other'] }
  ]);
  return {
    ConfigModel: {
      find: mockFind,
      findOneAndUpdate: vi.fn().mockResolvedValue({})
    },
    default: {
      find: mockFind,
      findOneAndUpdate: vi.fn().mockResolvedValue({})
    }
  };
});

describe('Config Routes', () => {
  it('GET /api/v1/config should return success and all config fields', async () => {
    const response = await request(app).get('/api/v1/config');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.entryCategories).toEqual(['advice', 'wisdom']);
    expect(response.body.data.reportReasons).toEqual(['spam', 'other']);
  });
});
