import { useId, useState } from 'react';

function SearchForm({ initialValue, label, placeholder, onSearch }) {
  const [value, setValue] = useState(initialValue);
  const id = useId();

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(value.trim());
  }

  function handleClear() {
    setValue('');
    onSearch('');
  }

  return (
    <form className="search-form" role="search" onSubmit={handleSubmit}>
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        maxLength={100}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" className="button">
        Search
      </button>
      {(value || initialValue) && (
        <button type="button" className="button button-quiet" onClick={handleClear}>
          Clear
        </button>
      )}
    </form>
  );
}

export default function ListToolbar({ searchLabel, searchPlaceholder, search, onSearch, status, statuses, onStatusChange }) {
  const statusId = useId();

  return (
    <div className="list-toolbar">
      {/* Keyed by the active search so the input resets when the URL changes, e.g. on Back. */}
      <SearchForm
        key={search}
        initialValue={search}
        label={searchLabel}
        placeholder={searchPlaceholder}
        onSearch={onSearch}
      />
      <div className="status-filter">
        <label htmlFor={statusId}>Status</label>
        <select id={statusId} value={status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
