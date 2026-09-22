import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: string;
  // Notification preferences
  notificationEmail?: string;
  emailAlerts?: boolean;
  highRiskAlerts?: boolean;
  dailyDigest?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      default: "OFFICER",
    },
    // Notification preferences stored in DB
    notificationEmail: {
      type: String,
      default: null,
    },
    emailAlerts: {
      type: Boolean,
      default: false,
    },
    highRiskAlerts: {
      type: Boolean,
      default: true,
    },
    dailyDigest: {
      type: Boolean,
      default: false,
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

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

