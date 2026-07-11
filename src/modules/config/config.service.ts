import { ConfigModel } from './config.model';
import { EntryCategory, ReportReason } from '../entries/entries.constants';

let cachedCategories: string[] = [];
let cachedReportReasons: string[] = [];

/**
  * Seeds categories and report reasons to the database Config collection.
  * Ensures a sorted entries category list.
  */
export async function seedConfig(): Promise<void> {
  // 1. Entry Categories (alphabetically sorted, seed only if not exists)
  const existingCategories = await ConfigModel.findOne({ key: 'entryCategories' });
  if (!existingCategories) {
    const categoriesList = Object.values(EntryCategory).sort((a, b) => a.localeCompare(b));
    await ConfigModel.create({
      key: 'entryCategories',
      value: categoriesList
    });
  }

  // 2. Report Reasons (seed only if not exists)
  const existingReasons = await ConfigModel.findOne({ key: 'reportReasons' });
  if (!existingReasons) {
    const reasonsList = Object.values(ReportReason);
    await ConfigModel.create({
      key: 'reportReasons',
      value: reasonsList
    });
  }
}

/**
  * Loads database configuration records into in-memory caches.
  * Invoked on startup to ensure high-performance Zod schema validation.
  */
export async function loadConfigCache(): Promise<void> {
  const configs = await ConfigModel.find();
  
  const categoryConfig = configs.find(c => c.key === 'entryCategories');
  cachedCategories = categoryConfig ? categoryConfig.value : Object.values(EntryCategory).sort();

  const reportConfig = configs.find(c => c.key === 'reportReasons');
  cachedReportReasons = reportConfig ? reportConfig.value : Object.values(ReportReason);
}

export function getCachedCategories(): string[] {
  if (cachedCategories.length === 0) {
    return Object.values(EntryCategory);
  }
  return cachedCategories;
}

export function getCachedReportReasons(): string[] {
  if (cachedReportReasons.length === 0) {
    return Object.values(ReportReason);
  }
  return cachedReportReasons;
}

export async function getFullConfig(): Promise<Record<string, any>> {
  const configs = await ConfigModel.find();
  return configs.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, any>);
}
