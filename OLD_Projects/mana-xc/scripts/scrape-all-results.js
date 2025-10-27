// Script to scrape "All Results" page from Athletic.net
const puppeteer = require('puppeteer');

async function scrapeAllResults(meetId) {
    const url = `https://www.athletic.net/CrossCountry/meet/${meetId}/results/all`;

    console.log(`\n=== SCRAPING ALL RESULTS ===`);
    console.log(`URL: ${url}\n`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

        console.log('Loading "All Results" page...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('Page loaded, waiting for content...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extract all the data
        const resultsData = await page.evaluate(() => {
            const data = {
                pageTitle: document.title,
                meetInfo: {},
                races: [],
                allTables: []
            };

            // Try to find meet name
            const h1 = document.querySelector('h1');
            if (h1) data.meetInfo.name = h1.textContent.trim();

            // Try to find date
            const dateEl = document.querySelector('[class*="date"], time, .meet-date');
            if (dateEl) data.meetInfo.date = dateEl.textContent.trim();

            // Find location
            const locationEl = document.querySelector('[class*="location"], .meet-location');
            if (locationEl) data.meetInfo.location = locationEl.textContent.trim();

            // Find ALL tables on the page
            const tables = document.querySelectorAll('table');
            console.log(`Found ${tables.length} tables`);

            tables.forEach((table, tableIndex) => {
                const tableData = {
                    index: tableIndex,
                    className: table.className,
                    id: table.id,
                    headers: [],
                    rows: []
                };

                // Get headers
                const headerCells = table.querySelectorAll('thead th, tr:first-child th');
                tableData.headers = Array.from(headerCells).map(th => th.textContent.trim());

                // Get all rows
                const bodyRows = table.querySelectorAll('tbody tr, tr');
                bodyRows.forEach((row, rowIndex) => {
                    const cells = Array.from(row.querySelectorAll('td, th')).map(cell => {
                        // Get text and any links
                        const text = cell.textContent.trim();
                        const link = cell.querySelector('a');
                        const href = link ? link.getAttribute('href') : null;
                        return { text, href };
                    });

                    // Only add rows with actual data (skip empty rows)
                    if (cells.length > 0 && cells.some(c => c.text)) {
                        tableData.rows.push({
                            rowIndex,
                            cells: cells.map(c => c.text), // Just text for now
                            links: cells.filter(c => c.href).map(c => c.href)
                        });
                    }
                });

                data.allTables.push(tableData);
            });

            // Look for race section headers
            const headers = document.querySelectorAll('h2, h3, h4, .race-title, [class*="race"]');
            headers.forEach(header => {
                const text = header.textContent.trim();
                if (text.length > 0 && text.length < 100 &&
                    (text.toLowerCase().includes('varsity') ||
                     text.toLowerCase().includes('miles') ||
                     text.toLowerCase().includes('boys') ||
                     text.toLowerCase().includes('girls'))) {
                    data.races.push(text);
                }
            });

            return data;
        });

        // Display the findings
        console.log('PAGE TITLE:');
        console.log(`  ${resultsData.pageTitle}\n`);

        console.log('MEET INFO:');
        console.log(`  Name: ${resultsData.meetInfo.name || 'Not found'}`);
        console.log(`  Date: ${resultsData.meetInfo.date || 'Not found'}`);
        console.log(`  Location: ${resultsData.meetInfo.location || 'Not found'}\n`);

        console.log(`RACE HEADERS FOUND: ${resultsData.races.length}`);
        resultsData.races.forEach(race => {
            console.log(`  - ${race}`);
        });

        console.log(`\n\nTABLES FOUND: ${resultsData.allTables.length}\n`);

        resultsData.allTables.forEach(table => {
            console.log(`\n========== TABLE ${table.index} ==========`);
            console.log(`Class: ${table.className}`);
            console.log(`ID: ${table.id}`);
            console.log(`Headers (${table.headers.length}): ${table.headers.join(' | ')}`);
            console.log(`Total rows: ${table.rows.length}`);

            // Show first 5 rows as sample
            console.log('\nSample rows (first 5):');
            table.rows.slice(0, 5).forEach(row => {
                console.log(`  Row ${row.rowIndex}: ${row.cells.join(' | ')}`);
            });

            // Show last 2 rows to see the pattern
            if (table.rows.length > 5) {
                console.log('\nLast 2 rows:');
                table.rows.slice(-2).forEach(row => {
                    console.log(`  Row ${row.rowIndex}: ${row.cells.join(' | ')}`);
                });
            }
        });

        // Save everything for your inspection
        await page.screenshot({ path: 'all-results-screenshot.png', fullPage: true });
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('all-results-page.html', html);

        // Save structured data as JSON
        fs.writeFileSync('all-results-data.json', JSON.stringify(resultsData, null, 2));

        console.log('\n\n✅ Screenshot: all-results-screenshot.png');
        console.log('✅ HTML: all-results-page.html');
        console.log('✅ Data: all-results-data.json\n');

        return resultsData;

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

const meetId = process.argv[2] || '265306';
scrapeAllResults(meetId)
    .then(() => {
        console.log('Analysis complete!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
    });
