import { Link, useNavigate } from 'react-router';
import { createPurchaseOrder } from '../api/purchaseOrders.js';
import { useAuth } from '../auth/AuthContext.js';
import FormField from '../components/FormField.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { CURRENCIES, PURCHASE_ORDER_STATUSES } from '../documents/options.js';
import {
  DOCUMENT_NUMBER_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  SUPPLIER_NAME_MAX_LENGTH,
  validatePurchaseOrderForm,
} from '../documents/validation.js';
import { useForm } from '../hooks/useForm.js';

const EMPTY_ORDER = { poNumber: '', supplierName: '', issueDate: '', currency: 'INR', status: 'draft', notes: '' };

export default function NewPurchaseOrderPage() {
  const { csrfToken, sessionExpired } = useAuth();
  const navigate = useNavigate();

  async function save(values) {
    try {
      const { purchaseOrder } = await createPurchaseOrder(values, csrfToken);
      navigate(`/purchase-orders/${purchaseOrder.id}`, { state: { created: true } });
    } catch (error) {
      if (error.status === 401) sessionExpired();
      throw error;
    }
  }

  const { values, fieldErrors, formError, submitting, handleChange, handleSubmit } = useForm(
    EMPTY_ORDER,
    validatePurchaseOrderForm,
    save,
  );

  return (
    <>
      <PageHeader title="New purchase order" description="Record a purchase order you issued to a supplier." />
      <form className="card document-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <div className="form-grid">
          <FormField
            label="PO number"
            name="poNumber"
            autoComplete="off"
            maxLength={DOCUMENT_NUMBER_MAX_LENGTH}
            value={values.poNumber}
            onChange={handleChange}
            error={fieldErrors.poNumber}
          />
          <FormField
            label="Supplier name"
            name="supplierName"
            autoComplete="off"
            maxLength={SUPPLIER_NAME_MAX_LENGTH}
            value={values.supplierName}
            onChange={handleChange}
            error={fieldErrors.supplierName}
          />
          <FormField
            label="Issue date"
            name="issueDate"
            type="date"
            value={values.issueDate}
            onChange={handleChange}
            error={fieldErrors.issueDate}
          />
          <FormField
            label="Currency"
            name="currency"
            as="select"
            value={values.currency}
            onChange={handleChange}
            error={fieldErrors.currency}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </FormField>
          <FormField
            label="Status"
            name="status"
            as="select"
            value={values.status}
            onChange={handleChange}
            error={fieldErrors.status}
          >
            {PURCHASE_ORDER_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormField>
          <FormField
            label="Notes (optional)"
            name="notes"
            as="textarea"
            rows={4}
            maxLength={NOTES_MAX_LENGTH}
            value={values.notes}
            onChange={handleChange}
            error={fieldErrors.notes}
          />
        </div>
        <div className="form-actions">
          <Link className="button button-quiet" to="/purchase-orders">
            Cancel
          </Link>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save purchase order'}
          </button>
        </div>
      </form>
    </>
  );
}
