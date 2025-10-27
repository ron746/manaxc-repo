// Convert existing JSON file to 7 normalized CSV files
const fs = require('fs');

function parseTimeToCs(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.match(/(\d+):(\d+)(\.\d+)?/);
    if (!parts) return null;
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    const centiseconds = parts[3] ? Math.round(parseFloat(parts[3]) * 100) : 0;
    return minutes * 6000 + seconds * 100 + centiseconds;
}

function extractDistanceMeters(raceName) {
    const milesMatch = raceName.match(/([\d.]+)\s*Miles/i);
    const metersMatch = raceName.match(/([\d,]+)\s*Meters/i);

    if (milesMatch) {
        return Math.round(parseFloat(milesMatch[1]) * 1609.34);
    } else if (metersMatch) {
        return parseInt(metersMatch[1].replace(',', ''));
    }
    return 4409; // Default: 2.74 miles
}

function parseLocation(locationStr) {
    if (!locationStr) return { venueName: '', city: '', state: '' };

    const parts = locationStr.split(',').map(s => s.trim());
    const venueName = parts[0] || '';

    // Extract state from second part (e.g., "CA  US" → "CA")
    const secondPart = parts[1] || 'CA';
    const state = secondPart.split(/\s+/)[0] || 'CA';

    // Use state abbreviation as city for now
    const city = state;

    return { venueName, city, state };
}

function calculateGraduationYear(grade, seasonYear) {
    if (!grade || !seasonYear) return null;
    return seasonYear + (13 - parseInt(grade));
}

const jsonFile = process.argv[2];
const season = process.argv[3];

if (!jsonFile || !season) {
    console.log('\nUsage: node convert-to-normalized-csvs.js <jsonFile> <season>');
    console.log('Example: node convert-to-normalized-csvs.js athletic-net-1076-2025.json 2025\n');
    process.exit(1);
}

const seasonYear = parseInt(season);
const allMeets = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

// Maps to track unique entities
const venuesMap = new Map();
const coursesMap = new Map();
const schoolsMap = new Map();
const meetsMap = new Map();
const racesMap = new Map();
const athletesMap = new Map();
const resultsArray = [];

allMeets.forEach(meet => {
    const meetDate = meet.date || '';
    const { venueName, city, state } = parseLocation(meet.location);

    // 1. Venues
    if (venueName && !venuesMap.has(venueName)) {
        venuesMap.set(venueName, { name: venueName, city, state });
    }

    // 4. Meets
    if (!meetsMap.has(meet.meetId)) {
        meetsMap.set(meet.meetId, {
            athletic_net_id: meet.meetId,
            name: meet.meetName,
            meet_date: meetDate,
            season_year: seasonYear
        });
    }

    meet.races.forEach(race => {
        const distanceMeters = extractDistanceMeters(race.raceName);
        const courseKey = `${venueName}|${distanceMeters}`;

        // 2. Courses
        if (!coursesMap.has(courseKey)) {
            coursesMap.set(courseKey, {
                venue_name: venueName,
                distance_meters: distanceMeters,
                layout_version: 'standard'
            });
        }

        // 5. Races (MUST include gender in key to avoid duplicates!)
        const raceKey = `${meet.meetId}|${race.raceName}|${race.gender}`;
        if (!racesMap.has(raceKey)) {
            racesMap.set(raceKey, {
                meet_athletic_net_id: meet.meetId,
                name: race.raceName,
                gender: race.gender,
                distance_meters: distanceMeters,
                venue_name: venueName,
                athletic_net_id: race.raceId || ''
            });
        }

        race.results.forEach(result => {
            const graduationYear = calculateGraduationYear(result.grade, seasonYear);
            const athleteKey = `${result.fullName}|${result.school}|${graduationYear}`;

            // 3. Schools
            if (!schoolsMap.has(result.school)) {
                schoolsMap.set(result.school, { name: result.school });
            }

            // 6. Athletes (using full_name + school + graduation_year for uniqueness)
            if (!athletesMap.has(athleteKey)) {
                athletesMap.set(athleteKey, {
                    full_name: result.fullName,
                    school_name: result.school,
                    gender: race.gender,
                    graduation_year: graduationYear || ''
                });
            }

            // 7. Results
            const time_cs = parseTimeToCs(result.time);
            resultsArray.push({
                meet_athletic_net_id: meet.meetId,
                race_name: race.raceName,
                athlete_full_name: result.fullName,
                school_name: result.school,
                graduation_year: graduationYear || '',
                time_cs: time_cs || '',
                place_overall: result.place || '',
                season_year: seasonYear
            });
        });
    });
});

// Write CSV files
const prefix = jsonFile.replace('.json', '');

// 1. venues.csv
const venuesCSV = [
    'name,city,state',
    ...Array.from(venuesMap.values()).map(v =>
        `"${v.name}","${v.city}","${v.state}"`
    )
].join('\n');
fs.writeFileSync(`${prefix}-venues.csv`, venuesCSV);

// 2. courses.csv
const coursesCSV = [
    'venue_name,distance_meters,layout_version',
    ...Array.from(coursesMap.values()).map(c =>
        `"${c.venue_name}",${c.distance_meters},"${c.layout_version}"`
    )
].join('\n');
fs.writeFileSync(`${prefix}-courses.csv`, coursesCSV);

// 3. schools.csv
const schoolsCSV = [
    'name',
    ...Array.from(schoolsMap.values()).map(s => `"${s.name}"`)
].join('\n');
fs.writeFileSync(`${prefix}-schools.csv`, schoolsCSV);

// 4. meets.csv
const meetsCSV = [
    'athletic_net_id,name,meet_date,season_year',
    ...Array.from(meetsMap.values()).map(m =>
        `${m.athletic_net_id},"${m.name}","${m.meet_date}",${m.season_year}`
    )
].join('\n');
fs.writeFileSync(`${prefix}-meets.csv`, meetsCSV);

// 5. races.csv
const racesCSV = [
    'meet_athletic_net_id,name,gender,distance_meters,venue_name,athletic_net_id',
    ...Array.from(racesMap.values()).map(r =>
        `${r.meet_athletic_net_id},"${r.name}","${r.gender}",${r.distance_meters},"${r.venue_name}","${r.athletic_net_id}"`
    )
].join('\n');
fs.writeFileSync(`${prefix}-races.csv`, racesCSV);

// 6. athletes.csv
const athletesCSV = [
    'full_name,school_name,gender,graduation_year',
    ...Array.from(athletesMap.values()).map(a =>
        `"${a.full_name}","${a.school_name}","${a.gender}",${a.graduation_year}`
    )
].join('\n');
fs.writeFileSync(`${prefix}-athletes.csv`, athletesCSV);

// 7. results.csv
const resultsCSV = [
    'meet_athletic_net_id,race_name,athlete_full_name,school_name,graduation_year,time_cs,place_overall,season_year',
    ...resultsArray.map(r =>
        `${r.meet_athletic_net_id},"${r.race_name}","${r.athlete_full_name}","${r.school_name}",${r.graduation_year},${r.time_cs},${r.place_overall},${r.season_year}`
    )
].join('\n');
fs.writeFileSync(`${prefix}-results.csv`, resultsCSV);

// Summary
console.log(`\n✅ CONVERSION COMPLETE!`);
console.log(`\n📁 Generated 7 normalized CSV files from ${jsonFile}:`);
console.log(`   1. ${prefix}-venues.csv (${venuesMap.size} venues)`);
console.log(`   2. ${prefix}-courses.csv (${coursesMap.size} courses)`);
console.log(`   3. ${prefix}-schools.csv (${schoolsMap.size} schools)`);
console.log(`   4. ${prefix}-meets.csv (${meetsMap.size} meets)`);
console.log(`   5. ${prefix}-races.csv (${racesMap.size} races)`);
console.log(`   6. ${prefix}-athletes.csv (${athletesMap.size} athletes)`);
console.log(`   7. ${prefix}-results.csv (${resultsArray.length} results)\n`);
