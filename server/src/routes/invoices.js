import { Router } from 'express';
import { findOwnedDocument, listDocuments } from '../documents/queries.js';
import { validateInvoice } from '../documents/validation.js';
import { HttpError } from '../httpError.js';
import { requireAuth, requireCsrfToken } from '../middleware/auth.js';
import { noStore } from '../middleware/noStore.js';
import { INVOICE_STATUSES, Invoice, toPublicInvoice } from '../models/Invoice.js';

const DUPLICATE_KEY_ERROR = 11000;

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth, noStore);

invoicesRouter.get('/', async (req, res) => {
  const { items, pagination } = await listDocuments(Invoice, {
    userId: req.user._id,
    query: req.query,
    statuses: INVOICE_STATUSES,
    searchFields: ['invoiceNumberKey', 'supplierKey'],
    toPublic: toPublicInvoice,
  });
  res.json({ invoices: items, pagination });
});

invoicesRouter.post('/', requireCsrfToken, async (req, res) => {
  const values = validateInvoice(req.body);

  let invoice;
  try {
    invoice = await Invoice.create({ ...values, createdBy: req.user._id });
  } catch (error) {
    if (error.code === DUPLICATE_KEY_ERROR) {
      throw new HttpError(409, 'An invoice with this number already exists for this supplier.', {
        invoiceNumber: 'You already have an invoice with this number from this supplier.',
      });
    }
    throw error;
  }

  res.status(201).json({ invoice: toPublicInvoice(invoice) });
});

invoicesRouter.get('/:id', async (req, res) => {
  const invoice = await findOwnedDocument(Invoice, {
    id: req.params.id,
    userId: req.user._id,
    label: 'Invoice',
  });
  res.json({ invoice: toPublicInvoice(invoice) });
});
