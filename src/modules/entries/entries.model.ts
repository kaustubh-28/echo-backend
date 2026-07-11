import { Document, Schema, model } from 'mongoose';
import { EntryCategory, EntryStatus } from './entries.constants';

export interface IEntryDocument extends Document {
  submissionId: string;
  text: string;
  author?: string;
  source?: string;
  category: EntryCategory;
  email?: string;
  visitorHash: string;
  status: EntryStatus;
  moderationReason?: string;
  moderatedBy?: Schema.Types.ObjectId;
  moderatedAt?: Date;
  helpfulCount: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const entrySchema = new Schema<IEntryDocument>(
  {
    submissionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(EntryCategory),
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    visitorHash: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(EntryStatus),
      default: EntryStatus.PUBLISHED,
    },
    moderationReason: {
      type: String,
      trim: true,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    moderatedAt: {
      type: Date,
    },
    helpfulCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reportCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

// Compound index supporting archive browsing
entrySchema.index({ status: 1, createdAt: -1 });

// Compound index supporting category browsing
entrySchema.index({ status: 1, category: 1, createdAt: -1 });

// Text index supporting full-text search across entry text, author and source attribution
entrySchema.index(
  {
    text: 'text',
    author: 'text',
    source: 'text',
  },
  {
    weights: {
      text: 10,
      author: 3,
      source: 1,
    },
    name: 'EntryTextSearchIndex',
  },
);

export const EntryModel = model<IEntryDocument>('Entry', entrySchema);
export default EntryModel;
