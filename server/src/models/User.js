import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // The unique index is what prevents duplicate accounts when two sign-ups race.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);

export function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}
