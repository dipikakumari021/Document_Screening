import mongoose, { Schema, Document, Model } from "mongoose";

export interface IScreening extends Document {
  screeningId: string;
  time: Date;
  documentType: string;
  name: string;
  riskScore: number;
  riskLevel: string;
  status: string;
  officerId: string;
  primaryConcern?: string | null;
  ocrData?: string | null;
  faceMatchScore?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const ScreeningSchema: Schema<IScreening> = new Schema(
  {
    screeningId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    time: {
      type: Date,
      default: Date.now,
    },
    documentType: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    riskScore: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    status: {
      type: String,
      required: true,
      default: "CLEARED",
    },
    officerId: {
      type: String,
      required: true,
    },
    primaryConcern: {
      type: String,
      default: null,
    },
    ocrData: {
      type: String,
      default: null,
    },
    faceMatchScore: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Screening: Model<IScreening> =
  mongoose.models.Screening ||
  mongoose.model<IScreening>("Screening", ScreeningSchema);
