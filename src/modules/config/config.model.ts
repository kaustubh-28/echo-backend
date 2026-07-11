import mongoose, { Schema, Document } from 'mongoose';

export interface IConfig {
  key: string;
  value: any;
}

export interface ConfigDocument extends IConfig, Document {}

const ConfigSchema = new Schema<ConfigDocument>({
  key: { type: String, required: true, unique: true },
  value: { type: Schema.Types.Mixed, required: true },
}, { 
  timestamps: true,
  collection: 'configs'
});

export const ConfigModel = mongoose.model<ConfigDocument>('Config', ConfigSchema);
export default ConfigModel;
