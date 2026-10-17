import Pagination from './Pagination.jsx';
import StatePanel from './StatePanel.jsx';

// The states every record list goes through: loading, failed, empty (with or without
// filters), a page past the end, and finally the results with pagination.
export default function ListResults({
  resource,
  items,
  pagination,
  nouns,
  isFiltered,
  onClearFilters,
  onPageChange,
  emptyAction,
  children,
}) {
  if (resource.status === 'loading') {
    return <StatePanel title={`Loading ${nouns.plural}…`} />;
  }

  if (resource.status === 'error') {
    return (
      <StatePanel
        role="alert"
        title={`Could not load ${nouns.plural}.`}
        detail={resource.error.message}
        action={
          <button type="button" className="button" onClick={resource.retry}>
            Try again
          </button>
        }
      />
    );
  }

  if (pagination.total === 0) {
    return isFiltered ? (
      <StatePanel
        title={`No ${nouns.plural} match your search or filter.`}
        action={
          <button type="button" className="button" onClick={onClearFilters}>
            Clear search and filter
          </button>
        }
      />
    ) : (
      <StatePanel title={`No ${nouns.plural} yet.`} detail="Records you add will appear here." action={emptyAction} />
    );
  }

  if (items.length === 0) {
    return (
      <StatePanel
        title="There is nothing on this page."
        detail={`The list has ${pagination.totalPages} ${pagination.totalPages === 1 ? 'page' : 'pages'}.`}
        action={
          <button type="button" className="button" onClick={() => onPageChange(1)}>
            Go to the first page
          </button>
        }
      />
    );
  }

  return (
    <>
      {children(items)}
      <Pagination pagination={pagination} nouns={nouns} onPageChange={onPageChange} />
    </>
  );
}
