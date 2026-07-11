import { Document, Schema, Types, model } from 'mongoose';
import { ReportReason } from './entries.constants';

export interface IReportDocument extends Document {
  entryId: Types.ObjectId;
  visitorHash: string;
  reason: ReportReason;
  createdAt: Date;
}

const reportSchema = new Schema<IReportDocument>(
  {
    entryId: {
      type: Schema.Types.ObjectId,
      ref: 'Entry',
      required: true,
    },
    visitorHash: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      enum: Object.values(ReportReason),
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
  },
);

reportSchema.index({ entryId: 1, visitorHash: 1 }, { unique: true });

export const ReportModel = model<IReportDocument>('Report', reportSchema);
export default ReportModel;
