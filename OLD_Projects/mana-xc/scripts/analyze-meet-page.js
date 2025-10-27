// Script to analyze Athletic.net meet result page
const puppeteer = require('puppeteer');

async function analyzeMeet(meetId) {
    const url = `https://www.athletic.net/CrossCountry/meet/${meetId}`;

    console.log(`\n=== ANALYZING MEET PAGE ===`);
    console.log(`URL: ${url}\n`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

        console.log('Loading meet page...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const meetData = await page.evaluate(() => {
            const data = {
                title: document.title,
                meetInfo: {},
                races: [],
                tables: []
            };

            // Try to find meet name and date
            const h1 = document.querySelector('h1');
            if (h1) data.meetInfo.name = h1.textContent.trim();

            // Find date elements
            const dateElements = document.querySelectorAll('[class*="date"], time, [datetime]');
            dateElements.forEach(el => {
                const text = el.textContent.trim();
                const datetime = el.getAttribute('datetime');
                if (text || datetime) {
                    data.meetInfo.date = text || datetime;
                }
            });

            // Find all tables (likely race results)
            const tables = document.querySelectorAll('table');
            tables.forEach((table, index) => {
                const headers = Array.from(table.querySelectorAll('thead th, th')).map(th => th.textContent.trim());
                const rows = Array.from(table.querySelectorAll('tbody tr, tr')).slice(0, 5).map(tr => {
                    return Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
                });

                data.tables.push({
                    index,
                    headers,
                    sampleRows: rows,
                    totalRows: table.querySelectorAll('tbody tr, tr').length
                });
            });

            // Find race links/tabs
            const raceLinks = document.querySelectorAll('a[href*="race"], button[class*="race"], [class*="tab"]');
            raceLinks.forEach(link => {
                const text = link.textContent.trim();
                const href = link.href || link.getAttribute('data-race-id') || '';
                if (text.length > 0 && text.length < 100) {
                    data.races.push({ text, href });
                }
            });

            return data;
        });

        console.log('MEET TITLE:');
        console.log(`  ${meetData.title}\n`);

        console.log('MEET INFO:');
        console.log(` Name: ${meetData.meetInfo.name || 'Not found'}`);
        console.log(`  Date: ${meetData.meetInfo.date || 'Not found'}\n`);

        console.log(`RACES/TABS FOUND: ${meetData.races.length}`);
        meetData.races.forEach(race => {
            console.log(`  ${race.text} → ${race.href}`);
        });

        console.log(`\n\nTABLES FOUND: ${meetData.tables.length}`);
        meetData.tables.forEach(table => {
            console.log(`\nTable ${table.index} (${table.totalRows} rows):`);
            console.log(`  Headers: ${table.headers.join(' | ')}`);
            console.log(`  Sample rows:`);
            table.sampleRows.forEach((row, i) => {
                console.log(`    Row ${i + 1}: ${row.join(' | ')}`);
            });
        });

        // Save files for inspection
        await page.screenshot({ path: 'meet-screenshot.png', fullPage: true });
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('meet-page.html', html);

        console.log('\n\n✅ Screenshot: meet-screenshot.png');
        console.log('✅ HTML: meet-page.html\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

const meetId = process.argv[2] || '265306';
analyzeMeet(meetId).then(() => process.exit(0)).catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
