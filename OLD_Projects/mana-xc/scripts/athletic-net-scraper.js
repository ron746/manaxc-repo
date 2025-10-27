// Complete Athletic.net scraper - extracts all race results for a school/season
const puppeteer = require('puppeteer');
const fs = require('fs');

// Helper: Split full name into first/last
function splitFullName(fullName) {
    if (!fullName) return { firstName: '', lastName: '' };
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const parts = cleanName.split(' ');
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
}

// Helper: Convert time to centiseconds
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
        await new Promise(resolve => setTimeout(resolve, 3000));

        const meetData = await page.evaluate(() => {
            const data = {
                meetId: window.location.pathname.match(/\/meet\/(\d+)/)?.[1],
                meetName: '',
                date: '',
                location: '',
                races: []
            };

            // Extract meet name from title or h2
            const titleMatch = document.title.match(/(.+?)\s*-\s*Results/);
            if (titleMatch) data.meetName = titleMatch[1].trim();

            // Extract date
            const dateEl = document.querySelector('[class*="date"]');
            if (dateEl) {
                const dateText = dateEl.textContent.trim();
                const match = dateText.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*(\w+\s+\d+,\s+\d{4})/);
                if (match) data.date = match[2];
            }

            // Extract location
            const locationEl = document.querySelector('a[href*="maps.google.com"]');
            if (locationEl) {
                data.location = locationEl.textContent.trim();
            }

            // Find all race sections (Mens/Womens)
            const sections = document.querySelectorAll('h4[class*="mb-1"]');

            sections.forEach(section => {
                const sectionText = section.textContent.trim();
                const isMens = sectionText.includes('Mens');
                const isWomens = sectionText.includes('Womens');

                if (!isMens && !isWomens) return;

                const gender = isMens ? 'M' : 'F';

                // Find all race subsections within this gender section
                const parent = section.closest('.col-sm-6');
                if (!parent) return;

                const raceHeaders = parent.querySelectorAll('h5');

                raceHeaders.forEach(raceHeader => {
                    const raceNameLink = raceHeader.querySelector('a');
                    if (!raceNameLink) return;

                    const raceName = raceNameLink.textContent.trim();
                    const raceId = raceNameLink.href.match(/\/results\/(\d+)/)?.[1];

                    // Find the results table for this race (next table after the header)
                    let currentEl = raceHeader.nextElementSibling;
                    while (currentEl && currentEl.tagName !== 'TABLE' && currentEl.tagName !== 'H5') {
                        currentEl = currentEl.nextElementSibling;
                    }

                    if (currentEl && currentEl.tagName === 'TABLE' && currentEl.classList.contains('DataTable')) {
                        const results = [];
                        const rows = currentEl.querySelectorAll('tbody tr');

                        rows.forEach(row => {
                            const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());

                            if (cells.length < 7) return; // Skip invalid rows

                            // Parse: Place | Grade | Name | [empty] | Time | [empty] | School | [empty] | [empty]
                            const place = cells[0].replace('.', '').trim();
                            const grade = cells[1];
                            const fullName = cells[2];
                            const time = cells[4];
                            const school = cells[6];

                            if (fullName && time && school) {
                                results.push({
                                    place: parseInt(place) || null,
                                    grade: parseInt(grade) || null,
                                    fullName: fullName,
                                    time: time,
                                    school: school
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
        console.log(`    🏃 ${meetData.races.length} races found`);

        return meetData;

    } catch (error) {
        console.error(`    ❌ Error scraping meet ${meetId}:`, error.message);
        return null;
    } finally {
        await page.close();
    }
}

async function scrapeSchoolSeason(schoolId, season) {
    const url = `https://www.athletic.net/team/${schoolId}/cross-country/${season}`;

    console.log(`\n🔍 Scraping ${url}\n`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract school name and meet IDs
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
        console.log(`📊 Found ${pageData.meetIds.length} meets\n`);

        if (pageData.meetIds.length === 0) {
            console.log('❌ No meets found for this school/season');
            await browser.close();
            return;
        }

        // Scrape each meet
        const allMeets = [];
        for (const meetId of pageData.meetIds) {
            const meetData = await scrapeMeetResults(meetId, browser);
            if (meetData) {
                allMeets.push(meetData);
            }
            // Be nice to the server
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Convert to CSV format
        const csvRows = [];
        csvRows.push('Meet Name,Meet Date,Location,Race Name,Gender,Place,Grade,Athlete,Time,Time (cs),School');

        allMeets.forEach(meet => {
            meet.races.forEach(race => {
                race.results.forEach(result => {
                    const { firstName, lastName } = splitFullName(result.fullName);
                    const time_cs = parseTimeToCs(result.time);

                    csvRows.push([
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

        // Save CSV
        const outputFile = `athletic-net-${schoolId}-${season}.csv`;
        fs.writeFileSync(outputFile, csvRows.join('\n'));

        // Save JSON
        const jsonFile = `athletic-net-${schoolId}-${season}.json`;
        fs.writeFileSync(jsonFile, JSON.stringify(allMeets, null, 2));

        // Summary
        const totalResults = allMeets.reduce((sum, meet) => {
            return sum + meet.races.reduce((raceSum, race) => raceSum + race.results.length, 0);
        }, 0);

        console.log(`\n✅ SCRAPING COMPLETE!`);
        console.log(`   📁 CSV: ${outputFile}`);
        console.log(`   📁 JSON: ${jsonFile}`);
        console.log(`   📊 ${allMeets.length} meets, ${totalResults} total results\n`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

// Run the scraper
const schoolId = process.argv[2];
const season = process.argv[3];

if (!schoolId || !season) {
    console.log('Usage: node athletic-net-scraper.js <schoolId> <season>');
    console.log('Example: node athletic-net-scraper.js 1076 2025');
    process.exit(1);
}

scrapeSchoolSeason(schoolId, season)
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
    });
