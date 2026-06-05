/**
 * Utility to format ISO date strings from the backend.
 * Ensures that naive strings (missing 'Z' or offset) are treated as UTC
 * to prevent the browser from incorrectly interpreting them as local time.
 */
export const formatAppDate = (dateStr: string | null | undefined, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!dateStr) return 'N/A';
  
  try {
    // Check if the string already has timezone information (Z or +/- offset)
    const hasZone = /Z|[+-]\d{2}(:?\d{2})?$/.test(dateStr);
    
    // If no zone and it looks like an ISO string, append 'Z' to treat as UTC
    const normalizedStr = (!hasZone && dateStr.includes('T')) 
      ? `${dateStr}Z` 
      : dateStr;
      
    const date = new Date(normalizedStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      ...options
    });
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Error';
  }
};

/**
 * Parses an ISO date string from the backend, ensuring naive strings are treated as UTC.
 */
export const parseAppDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const hasZone = /Z|[+-]\d{2}(:?\d{2})?$/.test(dateStr);
    const normalizedStr = (!hasZone && dateStr.includes('T')) ? `${dateStr}Z` : dateStr;
    const date = new Date(normalizedStr);
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    return null;
  }
};

/**
 * Specifically for time-only display
 */
export const formatAppTime = (dateStr: string | null | undefined): string => {
  return formatAppDate(dateStr, { 
    year: undefined, 
    month: undefined, 
    day: undefined,
    second: undefined
  });
};

/**
 * Specifically for date-only display
 */
export const formatAppDay = (dateStr: string | null | undefined): string => {
  return formatAppDate(dateStr, { 
    hour: undefined, 
    minute: undefined, 
    second: undefined 
  });
};
