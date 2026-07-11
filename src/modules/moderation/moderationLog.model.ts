import { Document, Schema, model, Types } from 'mongoose';
import { ModerationAction } from '@shared/types';
import { EntryStatus } from '../entries/entries.constants';

export interface IModerationLogDocument extends Document {
  entryId: Types.ObjectId;
  action: ModerationAction;
  oldStatus: EntryStatus | null;
  newStatus: EntryStatus;
  reason?: string | null;
  performedBy?: Types.ObjectId | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const moderationLogSchema = new Schema<IModerationLogDocument>(
  {
    entryId: {
      type: Schema.Types.ObjectId,
      ref: 'Entry',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: Object.values(ModerationAction),
    },
    oldStatus: {
      type: String,
      enum: [...Object.values(EntryStatus), null],
      default: null,
    },
    newStatus: {
      type: String,
      required: true,
      enum: Object.values(EntryStatus),
    },
    reason: {
      type: String,
      default: null,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

moderationLogSchema.index({ entryId: 1 });
moderationLogSchema.index({ createdAt: -1 });
moderationLogSchema.index({ action: 1 });

export const ModerationLogModel = model<IModerationLogDocument>('ModerationLog', moderationLogSchema);
export default ModerationLogModel;
