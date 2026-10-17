import { HttpError } from '../httpError.js';
import { cleanText, escapeRegExp, lookupKey } from './normalize.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE = 10000;
export const SEARCH_MAX_LENGTH = 100;
const SORT_ORDERS = { newest: -1, oldest: 1 };
const QUERY_TIME_LIMIT_MS = 5000;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const CONTROL_CHARACTERS = /\p{Cc}/u;

// Express 5 parses query strings without nesting, so values are strings, or arrays
// when a parameter is repeated. Anything but a single string is rejected.
function readParam(query, name, fields) {
  const value = query[name];
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') {
    fields[name] = 'Provide this parameter once.';
    return undefined;
  }
  return value;
}

function positiveInteger(query, name, { fallback, max }, fields) {
  const value = readParam(query, name, fields);
  if (value === undefined) return fallback;

  const number = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < 1 || number > max) {
    fields[name] = `Use a whole number from 1 to ${max}.`;
    return fallback;
  }
  return number;
}

export function parseListQuery(query, statuses) {
  const fields = {};
  const page = positiveInteger(query, 'page', { fallback: 1, max: MAX_PAGE }, fields);
  const limit = positiveInteger(query, 'limit', { fallback: DEFAULT_PAGE_SIZE, max: MAX_PAGE_SIZE }, fields);

  const status = readParam(query, 'status', fields);
  if (status !== undefined && !statuses.includes(status)) {
    fields.status = `Use one of: ${statuses.join(', ')}.`;
  }

  const sort = readParam(query, 'sort', fields) ?? 'newest';
  if (!Object.hasOwn(SORT_ORDERS, sort)) {
    fields.sort = 'Use newest or oldest.';
  }

  const rawSearch = readParam(query, 'search', fields);
  const search = rawSearch === undefined ? '' : cleanText(rawSearch);
  if (search.length > SEARCH_MAX_LENGTH) {
    fields.search = `Use ${SEARCH_MAX_LENGTH} characters or fewer.`;
  } else if (CONTROL_CHARACTERS.test(search)) {
    // The MongoDB driver refuses a NUL byte in a regular expression, and no stored
    // number or supplier name can contain control characters anyway. Tabs and line
    // breaks never get here: cleanText has already turned them into spaces.
    fields.search = 'Remove the unsupported characters.';
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'Invalid query parameters.', fields);
  }
  return { page, limit, status, sort, search };
}

export async function listDocuments(Model, { userId, query, statuses, searchFields, toPublic }) {
  const { page, limit, status, sort, search } = parseListQuery(query, statuses);

  const filter = { createdBy: userId };
  if (status) {
    filter.status = status;
  }
  if (search) {
    // Escaped, so the search is always a literal substring match on the lookup keys.
    const pattern = new RegExp(escapeRegExp(lookupKey(search)));
    filter.$or = searchFields.map((field) => ({ [field]: pattern }));
  }

  // _id breaks ties between records created in the same millisecond, so pages never
  // overlap or skip records.
  const order = SORT_ORDERS[sort];
  const [documents, total] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: order, _id: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(QUERY_TIME_LIMIT_MS)
      .lean(),
    Model.countDocuments(filter).maxTimeMS(QUERY_TIME_LIMIT_MS),
  ]);

  return {
    items: documents.map(toPublic),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Records belonging to other users look exactly like records that do not exist.
export async function findOwnedDocument(Model, { id, userId, label }) {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new HttpError(400, `Invalid ${label.toLowerCase()} id.`);
  }

  const document = await Model.findOne({ _id: id, createdBy: userId }).maxTimeMS(QUERY_TIME_LIMIT_MS).lean();
  if (!document) {
    throw new HttpError(404, `${label} not found.`);
  }
  return document;
}
