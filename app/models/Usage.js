import mongoose from "mongoose";

const UsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    repoScansUsed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

UsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.Usage || mongoose.model("Usage", UsageSchema);
