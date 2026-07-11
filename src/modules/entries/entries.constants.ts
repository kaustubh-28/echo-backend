export enum EntryCategory {
  WISDOM = 'wisdom',
  ADVICE = 'advice',
  LIFE = 'life',
  QUOTE = 'quote',
  REFLECTION = 'reflection',
  OBSERVATION = 'observation',
  PHILOSOPHY = 'philosophy',
  STOICISM = 'stoicism',
  PSYCHOLOGY = 'psychology',
  RELATIONSHIPS = 'relationships',
  FAMILY = 'family',
  FRIENDSHIP = 'friendship',
  LOVE = 'love',
  LEADERSHIP = 'leadership',
  CAREER = 'career',
  BUSINESS = 'business',
  ENTREPRENEURSHIP = 'entrepreneurship',
  BOOKS = 'books',
  WRITING = 'writing',
  EDUCATION = 'education',
  LEARNING = 'learning',
  PRODUCTIVITY = 'productivity',
  TECHNOLOGY = 'technology',
  PROGRAMMING = 'programming',
  ENGINEERING = 'engineering',
  SCIENCE = 'science',
  HISTORY = 'history',
  POLITICS = 'politics',
  SOCIETY = 'society',
  SPIRITUALITY = 'spirituality',
  RELIGION = 'religion',
  HEALTH = 'health',
  FITNESS = 'fitness',
  MENTAL_HEALTH = 'mental_health',
  HAPPINESS = 'happiness',
  DISCIPLINE = 'discipline',
  COURAGE = 'courage',
  KINDNESS = 'kindness',
  CREATIVITY = 'creativity',
  DESIGN = 'design',
  ART = 'art',
  MUSIC = 'music',
  CINEMA = 'cinema',
  TRAVEL = 'travel',
  NATURE = 'nature',
  SUCCESS = 'success',
  FAILURE = 'failure',
}

export enum EntryStatus {
  PUBLISHED = 'published',
  SHADOW_HIDDEN = 'shadow_hidden',
  REMOVED = 'removed',
}

export enum ReportReason {
  SPAM = 'spam',
  OFFENSIVE = 'offensive',
  OFFENSIVE_CONTENT = 'offensive_content',
  HATE_SPEECH = 'hate_speech',
  HARASSMENT = 'harassment',
  MISINFORMATION = 'misinformation',
  VIOLENCE = 'violence',
  SEXUAL_CONTENT = 'sexual_content',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  PRIVACY_VIOLATION = 'privacy_violation',
  SELF_HARM = 'self_harm',
  SCAM_FRAUD = 'scam_fraud',
  DUPLICATE = 'duplicate',
  LOW_QUALITY = 'low_quality',
  AI_GENERATED = 'ai_generated',
  OTHER = 'other',
}

export const ENTRY_LIMITS = {
  TEXT_MIN_LENGTH: 1,
  TEXT_MAX_LENGTH: 500,
  CONTEXT_MAX_LENGTH: 500,
  SOURCE_MAX_LENGTH: 100,
};

export const ENTRY_DEFAULTS = {
  STATUS: EntryStatus.PUBLISHED,
  HELPFUL_COUNT: 0,
  REPORT_COUNT: 0,
};

export const REPORT_LIMITS = {
  HIDE_THRESHOLD: 5,
};

export default {
  EntryCategory,
  EntryStatus,
  ReportReason,
  ENTRY_LIMITS,
  ENTRY_DEFAULTS,
  REPORT_LIMITS,
};
