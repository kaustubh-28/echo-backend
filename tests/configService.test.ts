import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  seedConfig,
  loadConfigCache,
  getCachedCategories,
  getCachedReportReasons,
  getFullConfig
} from '../src/modules/config/config.service';
import { ConfigModel } from '../src/modules/config/config.model';

vi.mock('../src/modules/config/config.model', () => {
  const mockFind = vi.fn().mockResolvedValue([
    { key: 'entryCategories', value: ['advice', 'wisdom'] },
    { key: 'reportReasons', value: ['spam', 'other'] }
  ]);
  const mockFindOne = vi.fn().mockResolvedValue(null);
  const mockCreate = vi.fn().mockResolvedValue({});
  
  return {
    ConfigModel: {
      find: mockFind,
      findOne: mockFindOne,
      create: mockCreate,
    },
    default: {
      find: mockFind,
      findOne: mockFindOne,
      create: mockCreate,
    }
  };
});

describe('ConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should seed configurations if they do not exist', async () => {
    vi.mocked(ConfigModel.findOne).mockResolvedValue(null);
    await seedConfig();
    expect(ConfigModel.findOne).toHaveBeenCalledWith({ key: 'entryCategories' });
    expect(ConfigModel.findOne).toHaveBeenCalledWith({ key: 'reportReasons' });
    expect(ConfigModel.create).toHaveBeenCalled();
  });

  it('should not seed configurations if they already exist', async () => {
    vi.mocked(ConfigModel.findOne).mockResolvedValue({ key: 'entryCategories', value: ['custom'] } as any);
    await seedConfig();
    expect(ConfigModel.findOne).toHaveBeenCalled();
    expect(ConfigModel.create).not.toHaveBeenCalled();
  });

  it('should load database configuration into memory caches', async () => {
    vi.mocked(ConfigModel.find).mockResolvedValue([
      { key: 'entryCategories', value: ['philosophy', 'poetry'] },
      { key: 'reportReasons', value: ['hateful', 'duplicate'] }
    ] as any);

    await loadConfigCache();
    expect(getCachedCategories()).toEqual(['philosophy', 'poetry']);
    expect(getCachedReportReasons()).toEqual(['hateful', 'duplicate']);
  });

  it('should return the full configuration record', async () => {
    vi.mocked(ConfigModel.find).mockResolvedValue([
      { key: 'entryCategories', value: ['advice'] },
      { key: 'reportReasons', value: ['other'] }
    ] as any);

    const config = await getFullConfig();
    expect(config).toEqual({
      entryCategories: ['advice'],
      reportReasons: ['other']
    });
  });
});
