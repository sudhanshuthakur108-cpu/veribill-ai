import { useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { getInvoice } from '../api/invoices.js';
import DetailList from '../components/DetailList.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatePanel from '../components/StatePanel.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { INVOICE_STATUSES } from '../documents/options.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const load = useCallback((signal) => getInvoice(id, { signal }), [id]);
  const { status, data, error, retry } = useApiResource(load);

  const backLink = (
    <Link className="back-link" to="/invoices">
      ← All invoices
    </Link>
  );

  if (status === 'loading') {
    return (
      <>
        {backLink}
        <StatePanel title="Loading invoice…" />
      </>
    );
  }

  if (status === 'error') {
    const notFound = error.status === 404 || error.status === 400;
    return (
      <>
        {backLink}
        {notFound ? (
          <StatePanel role="alert" title="Invoice not found." detail="Check the link, or find it in the list." />
        ) : (
          <StatePanel
            role="alert"
            title="Could not load this invoice."
            detail={error.message}
            action={
              <button type="button" className="button" onClick={retry}>
                Try again
              </button>
            }
          />
        )}
      </>
    );
  }

  const invoice = data.invoice;
  const statusBadge = <StatusBadge statuses={INVOICE_STATUSES} value={invoice.status} />;

  return (
    <>
      {backLink}
      {location.state?.created && (
        <p className="banner-success" role="status">
          Invoice saved.
        </p>
      )}
      <PageHeader title={`Invoice ${invoice.invoiceNumber}`} description={invoice.supplierName} action={statusBadge} />
      <section className="card" aria-label="Invoice details">
        <DetailList
          items={[
            { label: 'Invoice number', value: invoice.invoiceNumber },
            { label: 'Supplier', value: invoice.supplierName },
            { label: 'Invoice date', value: formatDate(invoice.invoiceDate) },
            { label: 'Due date', value: invoice.dueDate ? formatDate(invoice.dueDate) : 'Not set' },
            { label: 'Currency', value: invoice.currency },
            { label: 'Status', value: statusBadge },
            { label: 'Notes', value: invoice.notes ?? 'None' },
            { label: 'Created', value: formatDateTime(invoice.createdAt) },
            { label: 'Last updated', value: formatDateTime(invoice.updatedAt) },
          ]}
        />
      </section>
    </>
  );
}
