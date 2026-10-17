import { useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { getPurchaseOrder } from '../api/purchaseOrders.js';
import DetailList from '../components/DetailList.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatePanel from '../components/StatePanel.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { PURCHASE_ORDER_STATUSES } from '../documents/options.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { formatDate, formatDateTime } from '../utils/formatDate.js';

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const load = useCallback((signal) => getPurchaseOrder(id, { signal }), [id]);
  const { status, data, error, retry } = useApiResource(load);

  const backLink = (
    <Link className="back-link" to="/purchase-orders">
      ← All purchase orders
    </Link>
  );

  if (status === 'loading') {
    return (
      <>
        {backLink}
        <StatePanel title="Loading purchase order…" />
      </>
    );
  }

  if (status === 'error') {
    const notFound = error.status === 404 || error.status === 400;
    return (
      <>
        {backLink}
        {notFound ? (
          <StatePanel role="alert" title="Purchase order not found." detail="Check the link, or find it in the list." />
        ) : (
          <StatePanel
            role="alert"
            title="Could not load this purchase order."
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

  const order = data.purchaseOrder;
  const statusBadge = <StatusBadge statuses={PURCHASE_ORDER_STATUSES} value={order.status} />;

  return (
    <>
      {backLink}
      {location.state?.created && (
        <p className="banner-success" role="status">
          Purchase order saved.
        </p>
      )}
      <PageHeader title={`Purchase order ${order.poNumber}`} description={order.supplierName} action={statusBadge} />
      <section className="card" aria-label="Purchase order details">
        <DetailList
          items={[
            { label: 'PO number', value: order.poNumber },
            { label: 'Supplier', value: order.supplierName },
            { label: 'Issue date', value: formatDate(order.issueDate) },
            { label: 'Currency', value: order.currency },
            { label: 'Status', value: statusBadge },
            { label: 'Notes', value: order.notes ?? 'None' },
            { label: 'Created', value: formatDateTime(order.createdAt) },
            { label: 'Last updated', value: formatDateTime(order.updatedAt) },
          ]}
        />
      </section>
    </>
  );
}
