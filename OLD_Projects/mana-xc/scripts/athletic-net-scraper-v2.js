// Athletic.net Scraper v2 - More robust version
const puppeteer = require('puppeteer');
const fs = require('fs');

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

async function scrapeMeetResults(meetId, browser) {
    const url = `https://www.athletic.net/CrossCountry/meet/${meetId}/results/all`;

    console.log(`\n  📥 Scraping meet ${meetId}...`);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 4000)); // Wait longer for Angular

        const meetData = await page.evaluate(() => {
            const data = {
                meetId: window.location.pathname.match(/\/meet\/(\d+)/)?.[1],
                meetName: '',
                date: '',
                location: '',
                races: []
            };

            // Get meet name from title
            const titleMatch = document.title.match(/(.+?)\s*-\s*Results/);
            if (titleMatch) data.meetName = titleMatch[1].trim();

            // Extract date from the page - look for "Thu, Sep 11, 2025" format
            const dateElements = document.querySelectorAll('span');
            for (const span of dateElements) {
                const text = span.textContent.trim();
                // Match pattern like "Thu, Sep 11, 2025" or just "Sep 11, 2025"
                const dateMatch = text.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(\w+\s+\d+,\s+\d{4})/);
                if (dateMatch) {
                    data.date = dateMatch[2]; // Just the "Sep 11, 2025" part
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
                    } catch (e) {
                        console.log('Could not parse JSON-LD');
                    }
                }
            }

            // Fallback: get location from link
            if (!data.location) {
                const locationEl = document.querySelector('a[href*="maps.google.com"]');
                if (locationEl) data.location = locationEl.textContent.trim();
            }

            // Find ALL tables with class "DataTable" - these are the results tables
            const resultsTables = document.querySelectorAll('table.DataTable');
            console.log(`Found ${resultsTables.length} results tables`);

            // Look for h4 headers that indicate gender (Mens/Womens)
            const genderHeaders = Array.from(document.querySelectorAll('h4')).filter(h4 => {
                const text = h4.textContent;
                return text.includes('Mens Results') || text.includes('Womens Results');
            });

            genderHeaders.forEach(h4 => {
                const gender = h4.textContent.includes('Mens') ? 'M' : 'F';

                // Find the parent container
                const container = h4.closest('.col-sm-6');
                if (!container) return;

                // Find all h5 headers within this container (these are race names)
                const raceHeaders = container.querySelectorAll('h5');

                raceHeaders.forEach(h5 => {
                    const raceLink = h5.querySelector('a');
                    if (!raceLink) return;

                    const raceName = raceLink.textContent.trim();
                    const raceId = raceLink.href.match(/\/results\/(\d+)/)?.[1];

                    // Find the next DataTable after this h5
                    let nextEl = h5.nextElementSibling;
                    let foundTable = null;

                    // Search up to 5 siblings ahead for the table
                    for (let i = 0; i < 5 && nextEl; i++) {
                        if (nextEl.tagName === 'TABLE' && nextEl.classList.contains('DataTable')) {
                            foundTable = nextEl;
                            break;
                        }
                        if (nextEl.tagName === 'H5') break; // Stop if we hit another race header
                        nextEl = nextEl.nextElementSibling;
                    }

                    // Also check within a .table-responsive div
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

                            // Extract text from each cell
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

    console.log(`\n🔍 ATHLETIC.NET SCRAPER`);
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
                const match = link.href.match(/\/meet\/(\d+)/);
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

        // Generate CSV
        const csvRows = [];
        csvRows.push('Meet ID,Meet Name,Meet Date,Location,Race Name,Gender,Place,Grade,Athlete,Time,Time (cs),School');

        allMeets.forEach(meet => {
            meet.races.forEach(race => {
                race.results.forEach(result => {
                    const { firstName, lastName } = splitFullName(result.fullName);
                    const time_cs = parseTimeToCs(result.time);

                    csvRows.push([
                        meet.meetId || '',
                        `"${meet.meetName}"`,
                        `"${meet.date}"`,
                        `"${meet.location}"`,
                        `"${race.raceName}"`,
                        race.gender,
                        result.place || '',
                        result.grade || '',
                        `"${result.fullName}"`,
                        result.time,
                        time_cs || '',
                        `"${result.school}"`
                    ].join(','));
                });
            });
        });

        // Save files
        const csvFile = `athletic-net-${schoolId}-${season}.csv`;

        fs.writeFileSync(csvFile, csvRows.join('\n'));
        fs.writeFileSync(jsonFile, JSON.stringify(allMeets, null, 2));

        const totalResults = allMeets.reduce((sum, meet) => {
            return sum + meet.races.reduce((raceSum, race) => raceSum + race.results.length, 0);
        }, 0);

        console.log(`\n✅ SCRAPING COMPLETE!`);
        console.log(`   📁 CSV: ${csvFile}`);
        console.log(`   📁 JSON: ${jsonFile}`);
        console.log(`   📊 ${allMeets.length} total meets (${newMeetIds.length} new, ${skippedCount} existing)`);
        console.log(`   👥 ${totalResults} total athlete results\n`);

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
    console.log('\nUsage: node athletic-net-scraper-v2.js <schoolId> <season>');
    console.log('Example: node athletic-net-scraper-v2.js 1076 2025\n');
    process.exit(1);
}

scrapeSchoolSeason(schoolId, season)
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
    });
