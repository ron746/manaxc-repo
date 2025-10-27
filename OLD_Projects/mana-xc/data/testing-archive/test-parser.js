// Test script for CSV parser
const fs = require('fs');

// Import parser functions (simulated since we can't use TS directly)
function splitFullName(fullName) {
    if (!fullName) return { firstName: '', lastName: '' };
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const parts = cleanName.split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
}

function parseTimeToCs(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.match(/(\d+):(\d+)(\.\d+)?/);
    if (!parts) return null;

    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const centiseconds = parts[3] ? Math.round(parseFloat(parts[3]) * 100) : 0;

    return minutes * 6000 + seconds * 100 + centiseconds;
}

function parseCSVData(rawCsvText, mapping) {
  try {
    const lines = rawCsvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    // Create a reverse mapping for quick lookup
    const headerMap = {};
    for (const dbField in mapping) {
      const csvHeader = mapping[dbField];
      const index = headers.findIndex(h => h === csvHeader);
      if (index !== -1) {
        headerMap[dbField] = index;
      }
    }

    const results = dataRows.map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};

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

    // Filter out rows that failed to parse a time
    return results.filter(r => r.time_cs !== null && r.time_cs > 0);
  } catch (error) {
    console.error("CSV Parsing Failed:", error);
    return [];
  }
}

function groupParsedResults(results) {
  // Group by race_category + gender combination
  const groups = {};

  results.forEach(result => {
    const category = result.race_category || 'Unknown Race';
    const genderStr = result.gender === true ? 'M' : result.gender === false ? 'F' : 'U';
    const key = `${category}|${genderStr}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(result);
  });

  // Convert to RaceGroup array
  const raceGroups = Object.entries(groups).map(([key, results]) => {
    const [category, genderStr] = key.split('|');

    let gender = 'Unknown';
    if (genderStr === 'M') gender = 'M';
    else if (genderStr === 'F') gender = 'F';

    let raceName = category;
    if (category.toLowerCase().includes('varsity')) {
      raceName = gender === 'M' ? 'Varsity Boys' : gender === 'F' ? 'Varsity Girls' : category;
    } else if (category.toLowerCase().includes('junior varsity') || category.toLowerCase().includes('jv')) {
      raceName = gender === 'M' ? 'JV Boys' : gender === 'F' ? 'JV Girls' : category;
    } else if (category.toLowerCase().includes('reserves') || category.toLowerCase().includes('frosh')) {
      raceName = gender === 'M' ? 'Reserves Boys' : gender === 'F' ? 'Reserves Girls' : category;
    }

    return {
      name: raceName,
      gender,
      category,
      resultsCount: results.length,
      parsedResults: results
    };
  });

  return raceGroups;
}

// Read the test CSV
const csvContent = fs.readFileSync('2025_0911_STAL_test.csv', 'utf-8');

// Define the mapping (as it would be auto-detected)
const mapping = {
  'place_overall': 'Place',
  'full_name': 'Athlete',
  'school_name': 'School',
  'time_cs': 'Time',
  'gender': 'Gender',
  'race_category': 'Race'
};

console.log('=== TESTING CSV PARSER ===\n');

// Test parsing
const results = parseCSVData(csvContent, mapping);
console.log(`✅ Parsed ${results.length} athlete results\n`);

// Show sample parsed data
console.log('Sample parsed result:');
console.log(JSON.stringify(results[0], null, 2));
console.log('');

// Test time conversion
console.log('Time conversion examples:');
console.log(`"17:51.2" → ${parseTimeToCs("17:51.2")} centiseconds (expected: 107120)`);
console.log(`"25:51.4" → ${parseTimeToCs("25:51.4")} centiseconds (expected: 155140)`);
console.log('');

// Test name splitting
console.log('Name splitting examples:');
console.log(`"Edward Innes" → ${JSON.stringify(splitFullName("Edward Innes"))}`);
console.log(`"Edgar Gomez Tapia" → ${JSON.stringify(splitFullName("Edgar Gomez Tapia"))}`);
console.log('');

// Test race grouping
const raceGroups = groupParsedResults(results);
console.log(`✅ Grouped into ${raceGroups.length} distinct races:\n`);

raceGroups.forEach((group, index) => {
  console.log(`${index + 1}. ${group.name} (${group.gender})`);
  console.log(`   Category: ${group.category}`);
  console.log(`   Athletes: ${group.resultsCount}`);
  console.log('');
});

// Summary
console.log('=== TEST SUMMARY ===');
console.log(`Total athletes parsed: ${results.length}`);
console.log(`Total races detected: ${raceGroups.length}`);
console.log(`Expected races: 6`);
console.log(`✅ Test ${raceGroups.length === 6 ? 'PASSED' : 'FAILED'}`);
