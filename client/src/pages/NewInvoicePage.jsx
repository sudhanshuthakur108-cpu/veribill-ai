import { Link, useNavigate } from 'react-router';
import { createInvoice } from '../api/invoices.js';
import { useAuth } from '../auth/AuthContext.js';
import FormField from '../components/FormField.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { CURRENCIES, NEW_INVOICE_STATUSES } from '../documents/options.js';
import {
  DOCUMENT_NUMBER_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  SUPPLIER_NAME_MAX_LENGTH,
  validateInvoiceForm,
} from '../documents/validation.js';
import { useForm } from '../hooks/useForm.js';

const EMPTY_INVOICE = {
  invoiceNumber: '',
  supplierName: '',
  invoiceDate: '',
  dueDate: '',
  currency: 'INR',
  status: 'draft',
  notes: '',
};

export default function NewInvoicePage() {
  const { csrfToken, sessionExpired } = useAuth();
  const navigate = useNavigate();

  async function save(values) {
    try {
      const { invoice } = await createInvoice(values, csrfToken);
      navigate(`/invoices/${invoice.id}`, { state: { created: true } });
    } catch (error) {
      if (error.status === 401) sessionExpired();
      throw error;
    }
  }

  const { values, fieldErrors, formError, submitting, handleChange, handleSubmit } = useForm(
    EMPTY_INVOICE,
    validateInvoiceForm,
    save,
  );

  return (
    <>
      <PageHeader title="New invoice" description="Record a supplier invoice you received." />
      <form className="card document-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <div className="form-grid">
          <FormField
            label="Invoice number"
            name="invoiceNumber"
            autoComplete="off"
            maxLength={DOCUMENT_NUMBER_MAX_LENGTH}
            value={values.invoiceNumber}
            onChange={handleChange}
            error={fieldErrors.invoiceNumber}
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
            label="Invoice date"
            name="invoiceDate"
            type="date"
            value={values.invoiceDate}
            onChange={handleChange}
            error={fieldErrors.invoiceDate}
          />
          <FormField
            label="Due date (optional)"
            name="dueDate"
            type="date"
            value={values.dueDate}
            onChange={handleChange}
            error={fieldErrors.dueDate}
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
            hint="Matched, discrepancy and approval statuses will come from matching and review, which are not built yet."
            value={values.status}
            onChange={handleChange}
            error={fieldErrors.status}
          >
            {NEW_INVOICE_STATUSES.map((option) => (
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
          <Link className="button button-quiet" to="/invoices">
            Cancel
          </Link>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save invoice'}
          </button>
        </div>
      </form>
    </>
  );
}
