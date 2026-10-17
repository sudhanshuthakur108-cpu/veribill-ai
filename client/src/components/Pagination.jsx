export default function Pagination({ pagination, nouns, onPageChange }) {
  const { page, total, totalPages } = pagination;

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination-summary">
        {total} {total === 1 ? nouns.singular : nouns.plural} · Page {page} of {totalPages}
      </p>
      <div className="pagination-buttons">
        <button type="button" className="button button-quiet" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <button
          type="button"
          className="button button-quiet"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
