import { Document, Schema, model } from 'mongoose';

export interface IAdminDocument extends Document {
  username: string;
  passwordHash: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  passwordChangedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdminDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      required: true,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

export const AdminModel = model<IAdminDocument>('Admin', adminSchema);
export default AdminModel;
