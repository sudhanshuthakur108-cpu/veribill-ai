import { useSearchParams } from 'react-router';

// Matches the API limit; larger pages would be rejected.
const MAX_PAGE = 10000;

// Keeps a list's page, search and status filter in the URL, so filtered views can
// be bookmarked and the back button behaves as expected. Values that the API
// would reject are ignored instead of producing an error page.
export function useListParams(statuses) {
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedPage = Number(searchParams.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage > 1 && requestedPage <= MAX_PAGE ? requestedPage : 1;
  const search = (searchParams.get('search') ?? '').slice(0, 100);
  const requestedStatus = searchParams.get('status') ?? '';
  const status = statuses.some(({ value }) => value === requestedStatus) ? requestedStatus : '';

  function update(changes) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(changes)) {
        if (value) {
          next.set(key, String(value));
        } else {
          next.delete(key);
        }
      }
      return next;
    });
  }

  return {
    page,
    search,
    status,
    setPage: (value) => update({ page: value > 1 ? value : '' }),
    setSearch: (value) => update({ search: value, page: '' }),
    setStatus: (value) => update({ status: value, page: '' }),
    clearFilters: () => update({ search: '', status: '', page: '' }),
  };
}
