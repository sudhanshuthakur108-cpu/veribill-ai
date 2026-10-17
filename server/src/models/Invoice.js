import mongoose from 'mongoose';
import { toDateOnly } from '../documents/dates.js';
import { lookupKey } from '../documents/normalize.js';

export const INVOICE_STATUSES = ['draft', 'pending_review', 'matched', 'discrepancy_found', 'approved', 'rejected'];

// The other statuses record outcomes of matching and approval, which do not exist
// yet. Letting people set them by hand would present results nothing has produced.
export const NEW_INVOICE_STATUSES = ['draft', 'pending_review'];

const invoiceSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    invoiceNumber: { type: String, required: true, trim: true, maxlength: 50 },
    invoiceNumberKey: { type: String, required: true },
    supplierName: { type: String, required: true, trim: true, maxlength: 200 },
    supplierKey: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date },
    currency: { type: String, required: true, default: 'INR', match: /^[A-Z]{3}$/ },
    status: { type: String, required: true, enum: INVOICE_STATUSES, default: 'draft' },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

invoiceSchema.pre('validate', function () {
  this.invoiceNumberKey = lookupKey(this.invoiceNumber ?? '');
  this.supplierKey = lookupKey(this.supplierName ?? '');
});

// Invoice numbers come from suppliers, and two suppliers can both send "INV-001",
// so a number only has to be unique per supplier.
invoiceSchema.index({ createdBy: 1, supplierKey: 1, invoiceNumberKey: 1 }, { unique: true });
invoiceSchema.index({ createdBy: 1, createdAt: -1, _id: -1 });
invoiceSchema.index({ createdBy: 1, status: 1, createdAt: -1, _id: -1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);

export function toPublicInvoice(invoice) {
  return {
    id: invoice._id.toString(),
    invoiceNumber: invoice.invoiceNumber,
    supplierName: invoice.supplierName,
    invoiceDate: toDateOnly(invoice.invoiceDate),
    dueDate: toDateOnly(invoice.dueDate),
    currency: invoice.currency,
    status: invoice.status,
    notes: invoice.notes ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}
