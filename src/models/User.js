import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true },
    email: { type: String, index: true },
    name: String,
    picture: String,
    googleRefreshToken: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
