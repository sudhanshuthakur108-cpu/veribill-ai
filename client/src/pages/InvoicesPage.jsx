import { useCallback } from 'react';
import { Link } from 'react-router';
import { listInvoices } from '../api/invoices.js';
import ListResults from '../components/ListResults.jsx';
import ListToolbar from '../components/ListToolbar.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { INVOICE_STATUSES } from '../documents/options.js';
import { useListParams } from '../documents/useListParams.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { formatDate } from '../utils/formatDate.js';

const NOUNS = { singular: 'invoice', plural: 'invoices' };

function InvoiceTable({ invoices }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Invoice number</th>
            <th scope="col">Supplier</th>
            <th scope="col">Invoice date</th>
            <th scope="col">Due date</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <Link to={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
              </td>
              <td className="cell-truncate" title={invoice.supplierName}>
                {invoice.supplierName}
              </td>
              <td>{formatDate(invoice.invoiceDate)}</td>
              <td>{formatDate(invoice.dueDate)}</td>
              <td>
                <StatusBadge statuses={INVOICE_STATUSES} value={invoice.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InvoicesPage() {
  const { page, search, status, setPage, setSearch, setStatus, clearFilters } = useListParams(INVOICE_STATUSES);
  const load = useCallback((signal) => listInvoices({ page, search, status }, { signal }), [page, search, status]);
  const resource = useApiResource(load);

  const newInvoiceLink = (
    <Link className="button button-primary" to="/invoices/new">
      New invoice
    </Link>
  );

  return (
    <>
      <PageHeader title="Invoices" description="Supplier invoices you have recorded, newest first." action={newInvoiceLink} />
      <section className="card" aria-label="Invoice list">
        <ListToolbar
          searchLabel="Search invoices"
          searchPlaceholder="Invoice number or supplier"
          search={search}
          onSearch={setSearch}
          status={status}
          statuses={INVOICE_STATUSES}
          onStatusChange={setStatus}
        />
        <ListResults
          resource={resource}
          items={resource.data?.invoices}
          pagination={resource.data?.pagination}
          nouns={NOUNS}
          isFiltered={Boolean(search || status)}
          onClearFilters={clearFilters}
          onPageChange={setPage}
          emptyAction={newInvoiceLink}
        >
          {(invoices) => <InvoiceTable invoices={invoices} />}
        </ListResults>
      </section>
    </>
  );
}
