// lib/admin/import-parser.ts

/**
 * Splits a full name into first and last name
 * Examples: "Edward Innes" -> ["Edward", "Innes"]
 *           "Edgar Gomez Tapia" -> ["Edgar", "Gomez Tapia"]
 */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: '', lastName: '' };
  
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  } else if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  } else {
    // First word is first name, rest is last name
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
}

/**
 * Parses a time string in format MM:SS.CC or M:SS.CC to centiseconds
 * Examples: "15:30.5" -> 93050, "5:05.23" -> 30523
 */
function parseTimeToCs(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  
  const cleaned = timeStr.trim();
  const parts = cleaned.split(':');
  
  if (parts.length !== 2) return null;
  
  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const centiseconds = secondsParts.length > 1 ? parseInt(secondsParts[1].padEnd(2, '0').substring(0, 2), 10) : 0;
  
  if (isNaN(minutes) || isNaN(seconds) || isNaN(centiseconds)) return null;
  
  // Convert to total centiseconds
  return (minutes * 60 * 100) + (seconds * 100) + centiseconds;
}

/**
 * Parses gender string to boolean (TRUE = Male, FALSE = Female)
 * Handles: M/F, Male/Female, Boys/Girls
 */
function parseGender(genderStr: string): boolean | null {
  if (!genderStr) return null;
  const cleaned = genderStr.trim().toUpperCase();
  if (cleaned === 'M' || cleaned === 'MALE' || cleaned === 'BOYS' || cleaned === 'BOY') return true;
  if (cleaned === 'F' || cleaned === 'FEMALE' || cleaned === 'GIRLS' || cleaned === 'GIRL') return false;
  return null;
}

interface ParsedResult {
  first_name: string;
  last_name: string;
  school_name: string;
  time_cs: number | null;
  place_overall: number | null;
  gender: boolean | null;
  grade: number | null;
  ath_net_id: string | null;
  bib_number: string | null;
  race_category: string | null;
}

/**
 * Main parser function that converts CSV text to structured result objects
 * @param csvText - Raw CSV file content
 * @param mapping - Object mapping database fields to CSV header names
 */
export function parseCSVData(csvText: string, mapping: Record<string, string>): ParsedResult[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return []; // Need at least header + 1 data row
  
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const results: ParsedResult[] = [];
  
  // Create reverse mapping: CSV header -> database field
  const headerToField: Record<string, string> = {};
  Object.entries(mapping).forEach(([dbField, csvHeader]) => {
    if (csvHeader) headerToField[csvHeader.toLowerCase()] = dbField;
  });
  
  // Parse each data row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with potential commas in quoted fields
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const rowData: Record<string, string> = {};
    
    // Map CSV values to their headers
    headers.forEach((header, index) => {
      rowData[header] = values[index] || '';
    });
    
    // Check if we have a full_name field or separate first/last
    let firstName = '';
    let lastName = '';
    
    if (mapping.full_name) {
      // Split full name
      const fullName = rowData[mapping.full_name.toLowerCase()] || '';
      const names = splitFullName(fullName);
      firstName = names.firstName;
      lastName = names.lastName;
    } else {
      // Use separate fields
      firstName = rowData[mapping.first_name?.toLowerCase()] || '';
      lastName = rowData[mapping.last_name?.toLowerCase()] || '';
    }
    
    const schoolName = rowData[mapping.school_name?.toLowerCase()] || '';
    const timeStr = rowData[mapping.time_cs?.toLowerCase()] || '';
    const placeStr = rowData[mapping.place_overall?.toLowerCase()] || '';
    const raceCategoryStr = rowData[mapping.race_category?.toLowerCase()] || '';
    
    // Skip rows missing critical data
    if (!firstName || !schoolName || !timeStr) continue;
    
    const time_cs = parseTimeToCs(timeStr);
    if (time_cs === null) continue; // Skip invalid times
    
    // Extract optional fields
    const genderStr = mapping.gender ? rowData[mapping.gender.toLowerCase()] : '';
    const gradeStr = mapping.grade ? rowData[mapping.grade.toLowerCase()] : '';
    
    results.push({
      first_name: firstName,
      last_name: lastName,
      school_name: schoolName,
      time_cs,
      place_overall: placeStr ? parseInt(placeStr, 10) : null,
      gender: parseGender(genderStr),
      grade: gradeStr ? parseInt(gradeStr, 10) : null,
      ath_net_id: mapping.ath_net_id ? rowData[mapping.ath_net_id.toLowerCase()] : null,
      bib_number: mapping.bib_number ? rowData[mapping.bib_number.toLowerCase()] : null,
      race_category: raceCategoryStr || null,
    });
  }
  
  return results;
}
