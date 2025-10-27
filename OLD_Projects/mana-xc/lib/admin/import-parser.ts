// lib/admin/import-parser.ts

/**
 * Splits a full name string into First Name and Last Name.
 * Handles complex surnames and converts to Title Case.
 */
export function splitFullName(fullName: string): { firstName: string, lastName: string } {
    if (!fullName) return { firstName: '', lastName: '' };
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const parts = cleanName.split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
}

/**
 * Converts time strings (e.g., "15:30.25", "18:01") to centiseconds.
 * NON-NEGOTIABLE RULE: All times stored as centiseconds.
 */
export function parseTimeToCs(timeStr: string): number | null {
    if (!timeStr) return null;
    const parts = timeStr.match(/(\d+):(\d+)(\.\d+)?/);
    if (!parts) return null;

    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const centiseconds = parts[3] ? Math.round(parseFloat(parts[3]) * 100) : 0;
    
    return minutes * 6000 + seconds * 100 + centiseconds;
}

/**
 * Parses raw CSV text into an array of structured athlete results.
 * This is the real implementation that replaces the mock function.
 */
export function parseCSVData(
  rawCsvText: string,
  mapping: Record<string, string>
): Array<Record<string, unknown>> {
  try {
    const lines = rawCsvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    // Create a reverse mapping for quick lookup
    const headerMap: Record<string, number> = {};
    for (const dbField in mapping) {
      const csvHeader = mapping[dbField];
      const index = headers.findIndex(h => h === csvHeader);
      if (index !== -1) {
        headerMap[dbField] = index;
      }
    }

    const results = dataRows.map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: Record<string, unknown> = {};
      
      let firstName = '', lastName = '';

      // Handle full name vs. split name
      if (headerMap.hasOwnProperty('full_name')) {
        const fullName = values[headerMap['full_name']];
        const names = splitFullName(fullName);
        firstName = names.firstName;
        lastName = names.lastName;
      } else {
        if (headerMap.hasOwnProperty('first_name')) {
          firstName = values[headerMap['first_name']];
        }
        if (headerMap.hasOwnProperty('last_name')) {
          lastName = values[headerMap['last_name']];
        }
      }

      row['first_name'] = firstName;
      row['last_name'] = lastName;

      // Map other fields
      for (const dbField in headerMap) {
        if (dbField === 'full_name' || dbField === 'first_name' || dbField === 'last_name') continue;
        
        const value = values[headerMap[dbField]];
        if (dbField === 'time_cs') {
          row[dbField] = parseTimeToCs(value);
        } else if (dbField === 'gender') {
          const lowerVal = value.toLowerCase();
          row[dbField] = lowerVal.startsWith('b') || lowerVal.startsWith('m'); // true for Boys/Male
        } else if (dbField === 'place_overall' || dbField === 'grade') {
          row[dbField] = parseInt(value, 10) || null;
        } else {
          row[dbField] = value || null;
        }
      }
      
      return row;
    });

    // Filter out rows that failed to parse a time, as they are not valid results
    return results.filter(r => {
      const t = r['time_cs'];
      return typeof t === 'number' && t > 0;
    });
  } catch (error) {
    console.error("CSV Parsing Failed:", error);
    return [];
  }
}