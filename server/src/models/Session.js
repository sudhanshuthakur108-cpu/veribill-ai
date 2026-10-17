import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    // SHA-256 of the cookie token. The token itself is never stored, so a database
    // leak does not hand out working sessions.
    _id: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    csrfToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// MongoDB removes expired sessions in the background. Lookups still check
// expiresAt because the TTL monitor only runs about once a minute.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model('Session', sessionSchema);
