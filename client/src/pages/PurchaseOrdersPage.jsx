import { useCallback } from 'react';
import { Link } from 'react-router';
import { listPurchaseOrders } from '../api/purchaseOrders.js';
import ListResults from '../components/ListResults.jsx';
import ListToolbar from '../components/ListToolbar.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { PURCHASE_ORDER_STATUSES } from '../documents/options.js';
import { useListParams } from '../documents/useListParams.js';
import { useApiResource } from '../hooks/useApiResource.js';
import { formatDate } from '../utils/formatDate.js';

const NOUNS = { singular: 'purchase order', plural: 'purchase orders' };

function PurchaseOrderTable({ orders }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">PO number</th>
            <th scope="col">Supplier</th>
            <th scope="col">Issue date</th>
            <th scope="col">Currency</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link to={`/purchase-orders/${order.id}`}>{order.poNumber}</Link>
              </td>
              <td className="cell-truncate" title={order.supplierName}>
                {order.supplierName}
              </td>
              <td>{formatDate(order.issueDate)}</td>
              <td>{order.currency}</td>
              <td>
                <StatusBadge statuses={PURCHASE_ORDER_STATUSES} value={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const { page, search, status, setPage, setSearch, setStatus, clearFilters } = useListParams(PURCHASE_ORDER_STATUSES);
  const load = useCallback((signal) => listPurchaseOrders({ page, search, status }, { signal }), [page, search, status]);
  const resource = useApiResource(load);

  const newOrderLink = (
    <Link className="button button-primary" to="/purchase-orders/new">
      New purchase order
    </Link>
  );

  return (
    <>
      <PageHeader title="Purchase orders" description="Purchase orders you have recorded, newest first." action={newOrderLink} />
      <section className="card" aria-label="Purchase order list">
        <ListToolbar
          searchLabel="Search purchase orders"
          searchPlaceholder="PO number or supplier"
          search={search}
          onSearch={setSearch}
          status={status}
          statuses={PURCHASE_ORDER_STATUSES}
          onStatusChange={setStatus}
        />
        <ListResults
          resource={resource}
          items={resource.data?.purchaseOrders}
          pagination={resource.data?.pagination}
          nouns={NOUNS}
          isFiltered={Boolean(search || status)}
          onClearFilters={clearFilters}
          onPageChange={setPage}
          emptyAction={newOrderLink}
        >
          {(orders) => <PurchaseOrderTable orders={orders} />}
        </ListResults>
      </section>
    </>
  );
}
