/**
 * Validators and sanitizers for data handling
 */

/**
 * Safely parse and ensure a value is a valid integer
 * @param value - Value to normalize
 * @param defaultValue - Default value if input is invalid (default: 0)
 * @returns A valid integer
 */
export function ensureValidScore(value: any, defaultValue: number = 0): number {
  // If value is undefined or null, return default
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  // Convert to number first
  const num = Number(value);
  
  // Check if it's NaN, Infinity, or not an integer
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  
  // Return the integer portion
  return Math.round(num);
}

/**
 * Creates a database-safe object with sanitized score values
 * This is used when updating the database to ensure no invalid values are stored
 * @param data - Data object that might contain score fields
 * @returns A sanitized copy with safe score values
 */
export function sanitizeScoreFields(data: Record<string, any>): Record<string, any> {
  // Create a safe copy of the data
  const result = { ...data };
  
  // List of known score field names in our application
  const scoreFields = ['atsScore', 'matchScore', 'score'];
  
  // Sanitize each field if it exists in the data
  for (const field of scoreFields) {
    if (field in result) {
      result[field] = ensureValidScore(result[field]);
    }
  }
  
  return result;
}