// Athletic.net Scraper v3 - Optimized for batch import with normalized CSV files
const puppeteer = require('puppeteer');
const fs = require('fs');
const crypto = require('crypto');

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
    // "2.74 Miles Varsity" → 4409 meters
    // "5000 Meters JV" → 5000 meters
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
    // "Montgomery Hill Park, CA  US" → { venueName: "Montgomery Hill Park", city: "CA", state: "CA" }
    // "Crystal Springs, CA  US" → { venueName: "Crystal Springs", city: "CA", state: "CA" }
    if (!locationStr) return { venueName: '', city: '', state: '' };

    const parts = locationStr.split(',').map(s => s.trim());
    const venueName = parts[0] || '';

    // Extract state from second part (e.g., "CA  US" → "CA")
    const secondPart = parts[1] || 'CA';
    const state = secondPart.split(/\s+/)[0] || 'CA'; // Take first word before space

    // Use state abbreviation as city for now (since Athletic.net doesn't give city)
    const city = state;

    return { venueName, city, state };
}

function calculateGraduationYear(grade, seasonYear) {
    // Grade 9 in 2025 → graduates 2029 (2025 + (13 - 9) = 2025 + 4)
    if (!grade || !seasonYear) return null;
    return seasonYear + (13 - parseInt(grade));
}

async function scrapeMeetResults(meetId, browser) {
    const url = `https://www.athletic.net/CrossCountry/meet/${meetId}/results/all`;

    console.log(`\n  📥 Scraping meet ${meetId}...`);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for Angular

        const meetData = await page.evaluate(() => {
            const data = {
                meetId: window.location.pathname.match(///meet/(\d+)/)?.[1],
                meetName: '',
                date: '',
                location: '',
                races: []
            };

            // Get meet name from title
            const titleMatch = document.title.match(/(.+?)\s*-\s*Results/);
            if (titleMatch) data.meetName = titleMatch[1].trim();

            // Extract date from the page
            const dateElements = document.querySelectorAll('span');
            for (const span of dateElements) {
                const text = span.textContent.trim();
                const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\w+\s+\d+,\s+\d{4})/);
                if (dateMatch) {
                    data.date = dateMatch[2]; // "Sep 11, 2025"
                    break;
                }
            }

            // Fallback: Try JSON-LD structured data
            if (!data.date) {
                const jsonLd = document.querySelector('script[type="application/ld+json"]');
                if (jsonLd) {
                    try {
                        const jsonData = JSON.parse(jsonLd.textContent);
                        if (jsonData.datePublished) {
                            data.date = jsonData.datePublished;
                        }
                        if (jsonData.contentLocation?.name) {
                            data.location = jsonData.contentLocation.name;
                        }
                    } catch (e) {}
                }
            }

            // Get location from link
            if (!data.location) {
                const locationEl = document.querySelector('a[href*="maps.google.com"]');
                if (locationEl) data.location = locationEl.textContent.trim();
            }

            // Find gender headers (Mens/Womens Results)
            const genderHeaders = Array.from(document.querySelectorAll('h4')).filter(h4 => {
                const text = h4.textContent;
                return text.includes('Mens Results') || text.includes('Womens Results');
            });

            genderHeaders.forEach(h4 => {
                const gender = h4.textContent.includes('Mens') ? 'M' : 'F';

                const container = h4.closest('.col-sm-6');
                if (!container) return;

                const raceHeaders = container.querySelectorAll('h5');

                raceHeaders.forEach(h5 => {
                    const raceLink = h5.querySelector('a');
                    if (!raceLink) return;

                    const raceName = raceLink.textContent.trim();
                    const raceId = raceLink.href.match(///results/(\d+)/)?.[1];

                    // Find the next DataTable after this h5
                    let nextEl = h5.nextElementSibling;
                    let foundTable = null;

                    for (let i = 0; i < 5 && nextEl; i++) {
                        if (nextEl.tagName === 'TABLE' && nextEl.classList.contains('DataTable')) {
                            foundTable = nextEl;
                            break;
                        }
                        if (nextEl.tagName === 'H5') break;
                        nextEl = nextEl.nextElementSibling;
                    }

                    if (!foundTable) {
                        let checkEl = h5.nextElementSibling;
                        for (let i = 0; i < 5 && checkEl; i++) {
                            if (checkEl.classList && checkEl.classList.contains('table-responsive')) {
                                foundTable = checkEl.querySelector('table.DataTable');
                                break;
                            }
                            checkEl = checkEl.nextElementSibling;
                        }
                    }

                    if (foundTable) {
                        const results = [];
                        const rows = foundTable.querySelectorAll('tbody tr');

                        rows.forEach(row => {
                            const cells = Array.from(row.querySelectorAll('td'));
                            if (cells.length < 7) return;

                            const cellTexts = cells.map(td => td.textContent.trim());

                            // Format: [0]=Place, [1]=Grade, [2]=Name, [3]=empty, [4]=Time, [5]=empty, [6]=School
                            const place = cellTexts[0].replace('.', '').trim();
                            const grade = cellTexts[1];
                            const fullName = cellTexts[2];
                            const time = cellTexts[4];
                            const school = cellTexts[6];

                            if (fullName && time && school) {
                                results.push({
                                    place: parseInt(place) || null,
                                    grade: parseInt(grade) || null,
                                    fullName,
                                    time,
                                    school
                                });
                            }
                        });

                        if (results.length > 0) {
                            data.races.push({
                                raceId,
                                raceName,
                                gender,
                                results
                            });
                        }
                    }
                });
            });

            return data;
        });

        console.log(`    ✅ ${meetData.meetName} - ${meetData.date}`);
        console.log(`    📍 ${meetData.location}`);
        console.log(`    🏃 ${meetData.races.length} races, ${meetData.races.reduce((sum, r) => sum + r.results.length, 0)} total results`);

        return meetData;

    } catch (error) {
        console.error(`    ❌ Error: ${error.message}`);
        return null;
    } finally {
        await page.close();
    }
}

async function scrapeSchoolSeason(schoolId, season) {
    const url = `https://www.athletic.net/team/${schoolId}/cross-country/${season}`;
    const seasonYear = parseInt(season);

    console.log(`\n🔍 ATHLETIC.NET SCRAPER V3`);
    console.log(`📍 ${url}\n`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const pageData = await page.evaluate(() => {
            const schoolName = document.querySelector('h2')?.textContent.trim() || '';
            const meetLinks = Array.from(document.querySelectorAll('a[href*="/CrossCountry/meet/"]'));
            const meetIds = [...new Set(meetLinks.map(link => {
                const match = link.href.match(///meet/(\d+)/);
                return match ? match[1] : null;
            }).filter(Boolean))];
            return { schoolName, meetIds };
        });

        await page.close();

        console.log(`🏫 School: ${pageData.schoolName}`);
        console.log(`📅 Season: ${season}`);
        console.log(`📊 Found ${pageData.meetIds.length} meets`);

        if (pageData.meetIds.length === 0) {
            console.log('\n❌ No meets found for this school/season\n');
            await browser.close();
            return;
        }

        // Check for existing data (duplicate detection)
        const jsonFile = `athletic-net-${schoolId}-${season}.json`;
        let existingMeetIds = new Set();

        if (fs.existsSync(jsonFile)) {
            try {
                const existingData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
                existingMeetIds = new Set(existingData.map(meet => meet.meetId));
                console.log(`\n📋 Found existing data with ${existingMeetIds.size} meets`);
            } catch (e) {
                console.log('\n⚠️  Could not read existing data file');
            }
        }

        // Filter out already-scraped meets
        const newMeetIds = pageData.meetIds.filter(id => !existingMeetIds.has(id));
        const skippedCount = pageData.meetIds.length - newMeetIds.length;

        if (skippedCount > 0) {
            console.log(`   ⏭️  Skipping ${skippedCount} already-scraped meet(s)`);
        }

        if (newMeetIds.length === 0) {
            console.log(`\n✅ All meets already scraped! No new data to fetch.\n`);
            await browser.close();
            return;
        }

        console.log(`   🆕 Scraping ${newMeetIds.length} new meet(s)`);

        // Load existing meets
        let allMeets = [];
        if (fs.existsSync(jsonFile)) {
            try {
                allMeets = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
            } catch (e) {
                allMeets = [];
            }
        }

        // Scrape only new meets
        for (const meetId of newMeetIds) {
            const meetData = await scrapeMeetResults(meetId, browser);
            if (meetData && meetData.races.length > 0) {
                allMeets.push(meetData);
            }
            await new Promise(resolve => setTimeout(resolve, 2000)); // Be nice to server
        }

        // ============================================================================
        // GENERATE 7 NORMALIZED CSV FILES FOR BATCH IMPORT
        // ============================================================================

        // Maps to track unique entities
        const venuesMap = new Map(); // key: venueName
        const coursesMap = new Map(); // key: venueName + distanceMeters
        const schoolsMap = new Map(); // key: schoolName
        const meetsMap = new Map(); // key: athletic_net_id
        const racesMap = new Map(); // key: meetId + raceName
        const athletesMap = new Map(); // key: fullName + schoolName + graduationYear
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

                    // 6. Athletes
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
        const prefix = `athletic-net-${schoolId}-${season}`;

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

        // Also save JSON for reference
        fs.writeFileSync(jsonFile, JSON.stringify(allMeets, null, 2));

        // Summary
        console.log(`\n✅ SCRAPING COMPLETE!`);
        console.log(`\n📁 Generated 7 normalized CSV files:`);
        console.log(`   1. ${prefix}-venues.csv (${venuesMap.size} venues)`);
        console.log(`   2. ${prefix}-courses.csv (${coursesMap.size} courses)`);
        console.log(`   3. ${prefix}-schools.csv (${schoolsMap.size} schools)`);
        console.log(`   4. ${prefix}-meets.csv (${meetsMap.size} meets)`);
        console.log(`   5. ${prefix}-races.csv (${racesMap.size} races)`);
        console.log(`   6. ${prefix}-athletes.csv (${athletesMap.size} athletes)`);
        console.log(`   7. ${prefix}-results.csv (${resultsArray.length} results)`);
        console.log(`\n   📁 JSON: ${jsonFile}\n`);

        // Show summary
        allMeets.forEach(meet => {
            console.log(`   ${meet.meetName} (${meet.date}):`);
            meet.races.forEach(race => {
                console.log(`      - ${race.raceName} (${race.gender}): ${race.results.length} athletes`);
            });
        });

        console.log('');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        await browser.close();
    }
}

// Run
const schoolId = process.argv[2];
const season = process.argv[3];

if (!schoolId || !season) {
    console.log('\nUsage: node athletic-net-scraper-v3.js <schoolId> <season>');
    console.log('Example: node athletic-net-scraper-v3.js 1076 2025\n');
    process.exit(1);
}

scrapeSchoolSeason(schoolId, season)
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
    });