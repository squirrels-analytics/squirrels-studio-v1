// Create a new utility file for URL parameter handling

export function getHashParams(): URLSearchParams {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  return new URLSearchParams(queryIndex >= 0 ? hash.substring(queryIndex + 1) : '');
} 