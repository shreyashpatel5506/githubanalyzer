import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    avatar: String,
    email: String,

    plan: {
      type: String,
      enum: ["free", "pro", "pro_plus"],
      default: "free",
    },

    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
