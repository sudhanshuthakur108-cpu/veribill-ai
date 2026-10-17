import mongoose from 'mongoose';
import { toDateOnly } from '../documents/dates.js';
import { lookupKey } from '../documents/normalize.js';

export const PURCHASE_ORDER_STATUSES = ['draft', 'open', 'partially_received', 'completed', 'cancelled'];

const purchaseOrderSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    poNumber: { type: String, required: true, trim: true, maxlength: 50 },
    poNumberKey: { type: String, required: true },
    supplierName: { type: String, required: true, trim: true, maxlength: 200 },
    supplierKey: { type: String, required: true },
    issueDate: { type: Date, required: true },
    currency: { type: String, required: true, default: 'INR', match: /^[A-Z]{3}$/ },
    status: { type: String, required: true, enum: PURCHASE_ORDER_STATUSES, default: 'draft' },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

// Derived here so the keys can never drift from the values people see.
purchaseOrderSchema.pre('validate', function () {
  this.poNumberKey = lookupKey(this.poNumber ?? '');
  this.supplierKey = lookupKey(this.supplierName ?? '');
});

// PO numbers are issued by the buyer, so each user's numbers must be unique.
purchaseOrderSchema.index({ createdBy: 1, poNumberKey: 1 }, { unique: true });
purchaseOrderSchema.index({ createdBy: 1, createdAt: -1, _id: -1 });
purchaseOrderSchema.index({ createdBy: 1, status: 1, createdAt: -1, _id: -1 });

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export function toPublicPurchaseOrder(order) {
  return {
    id: order._id.toString(),
    poNumber: order.poNumber,
    supplierName: order.supplierName,
    issueDate: toDateOnly(order.issueDate),
    currency: order.currency,
    status: order.status,
    notes: order.notes ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
