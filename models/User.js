import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import {
  createTransport,
  sendEmail,
  generatePreviewURL,
} from "../lib/emailManager.js";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

userSchema.statics.hashPassword = (clearPassword) => {
  return bcrypt.hash(clearPassword, 7);
};

userSchema.methods.comparePassword = function (clearPassword) {
  return bcrypt.compare(clearPassword, this.password);
};

userSchema.statics.isEmailExist = async function(email) {
  if (!email) return false;
  const user = await this.findOne({ email });
  return !!user;
};

userSchema.methods.sendEmail = async function (subject, body) {
  const transport = createTransport();
  const result = await sendEmail({
    transport,
    to: this.email,
    subject,
    body,
  });
  const previewURL = generatePreviewURL(result);
  console.log("EMAIL SIMULADO: ", previewURL);
};

const User = mongoose.model("User", userSchema);

export default User;
