import { EntryCategory, EntryStatus } from './entries.constants';

export interface Entry {
  id: string;
  submissionId: string;
  text: string;
  author?: string;
  source?: string;
  category: EntryCategory;
  email?: string;
  visitorHash: string;
  status: EntryStatus;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  helpfulCount: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicEntry = Omit<Entry, 'visitorHash'>;

export function toPublicEntry(entry: Entry): PublicEntry {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { visitorHash: _visitorHash, ...publicEntry } = entry;
  return publicEntry;
}

export interface CreateEntryDto {
  text: string;
  author?: string;
  source?: string;
  category: EntryCategory;
  email?: string;
}

export interface UpdateEntryStatusDto {
  status: EntryStatus;
  moderationReason?: string;
  moderatedBy: string;
}

export interface QueryEntriesDto {
  category?: EntryCategory;
  page?: number;
  limit?: number;
}

export interface SearchEntriesDto {
  q: string;
  category?: EntryCategory;
  page?: number;
  limit?: number;
}

export interface EntryResponseDto {
  success: boolean;
  data: Partial<Entry>;
}

export interface PaginatedEntriesResult {
  entries: Entry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
