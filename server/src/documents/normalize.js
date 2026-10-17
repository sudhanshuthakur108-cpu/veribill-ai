// Shared by request validation and the models, so stored lookup keys always match
// what the API compares against.
export function cleanText(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

// Case- and whitespace-insensitive key used for duplicate checks and search.
// Punctuation and legal suffixes are kept on purpose: "ABC Traders" and
// "ABC Traders Pvt Ltd" may be different companies, and "PO-1" and "PO1" may be
// different orders.
export function lookupKey(value) {
  return cleanText(value).toLowerCase();
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
