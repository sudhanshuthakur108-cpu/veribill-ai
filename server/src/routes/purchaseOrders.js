import { Router } from 'express';
import { findOwnedDocument, listDocuments } from '../documents/queries.js';
import { validatePurchaseOrder } from '../documents/validation.js';
import { HttpError } from '../httpError.js';
import { requireAuth, requireCsrfToken } from '../middleware/auth.js';
import { noStore } from '../middleware/noStore.js';
import { PURCHASE_ORDER_STATUSES, PurchaseOrder, toPublicPurchaseOrder } from '../models/PurchaseOrder.js';

const DUPLICATE_KEY_ERROR = 11000;

export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.use(requireAuth, noStore);

purchaseOrdersRouter.get('/', async (req, res) => {
  const { items, pagination } = await listDocuments(PurchaseOrder, {
    userId: req.user._id,
    query: req.query,
    statuses: PURCHASE_ORDER_STATUSES,
    searchFields: ['poNumberKey', 'supplierKey'],
    toPublic: toPublicPurchaseOrder,
  });
  res.json({ purchaseOrders: items, pagination });
});

purchaseOrdersRouter.post('/', requireCsrfToken, async (req, res) => {
  const values = validatePurchaseOrder(req.body);

  let order;
  try {
    order = await PurchaseOrder.create({ ...values, createdBy: req.user._id });
  } catch (error) {
    if (error.code === DUPLICATE_KEY_ERROR) {
      throw new HttpError(409, 'A purchase order with this number already exists.', {
        poNumber: 'You already have a purchase order with this number.',
      });
    }
    throw error;
  }

  res.status(201).json({ purchaseOrder: toPublicPurchaseOrder(order) });
});

purchaseOrdersRouter.get('/:id', async (req, res) => {
  const order = await findOwnedDocument(PurchaseOrder, {
    id: req.params.id,
    userId: req.user._id,
    label: 'Purchase order',
  });
  res.json({ purchaseOrder: toPublicPurchaseOrder(order) });
});
