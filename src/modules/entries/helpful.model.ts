import { Document, Schema, Types, model } from 'mongoose';

export interface IHelpfulDocument extends Document {
  entryId: Types.ObjectId;
  visitorHash: string;
  createdAt: Date;
}

const helpfulSchema = new Schema<IHelpfulDocument>(
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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
  },
);

helpfulSchema.index({ entryId: 1, visitorHash: 1 }, { unique: true });

export const HelpfulModel = model<IHelpfulDocument>('Helpful', helpfulSchema);
export default HelpfulModel;
