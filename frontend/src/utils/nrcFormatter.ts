// src/utils/nrcFormatter.ts
// Auto-formats NRC numbers in Zambian format: NNNNNN/NN/N

/**
 * Format an NRC number as the user types
 * Input: digits only → Output: 123456/78/9
 */
export function formatNRC(raw: string): string {
  // Strip everything except digits and slashes
  const digits = raw.replace(/[^0-9]/g, '');

  if (digits.length === 0) return '';
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  return `${digits.slice(0, 6)}/${digits.slice(6, 8)}/${digits.slice(8, 9)}`;
}

/**
 * Check if an NRC string is fully valid format
 */
export function isValidNRC(nrc: string): boolean {
  return /^\d{6}\/\d{2}\/\d{1}$/.test(nrc.trim());
}

/**
 * Handle NRC input change event - returns formatted value
 */
export function handleNRCChange(inputValue: string): string {
  // Allow typed digits and slashes, then reformat
  const digits = inputValue.replace(/[^0-9]/g, '');
  return formatNRC(digits);
}
