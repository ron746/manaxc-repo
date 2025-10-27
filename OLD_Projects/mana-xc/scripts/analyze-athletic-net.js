// Script to analyze Athletic.net page structure
const puppeteer = require('puppeteer');

async function analyzePage(schoolId, season) {
    const url = `https://www.athletic.net/team/${schoolId}/cross-country/${season}`;

    console.log(`\n=== ANALYZING ATHLETIC.NET PAGE ===`);
    console.log(`URL: ${url}\n`);

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Set user agent to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log('Loading page...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('Page loaded, waiting for content to render...\n');

        // Wait a bit for Angular to fully render
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extract page structure
        const pageData = await page.evaluate(() => {
            const data = {
                title: document.title,
                mainContent: null,
                meets: [],
                tables: [],
                links: [],
                structure: []
            };

            // Get main content area
            const main = document.querySelector('main') || document.querySelector('#anetMain');
            if (main) {
                data.mainContent = main.className;
            }

            // Find all tables
            const tables = document.querySelectorAll('table');
            tables.forEach((table, index) => {
                const headers = Array.from(table.querySelectorAll('thead th, th')).map(th => th.textContent.trim());
                const rowCount = table.querySelectorAll('tbody tr, tr').length;
                data.tables.push({
                    index,
                    headers,
                    rowCount,
                    className: table.className,
                    id: table.id
                });
            });

            // Find links that might be meet results
            const links = document.querySelectorAll('a[href*="meet"], a[href*="race"], a[href*="result"]');
            links.forEach(link => {
                data.links.push({
                    text: link.textContent.trim(),
                    href: link.href,
                    className: link.className
                });
            });

            // Get overall structure
            const sections = document.querySelectorAll('section, div[class*="section"], div[class*="container"]');
            sections.forEach((section, index) => {
                if (section.textContent.trim().length > 20) {  // Ignore empty sections
                    data.structure.push({
                        index,
                        tag: section.tagName,
                        className: section.className,
                        id: section.id,
                        textPreview: section.textContent.trim().substring(0, 100)
                    });
                }
            });

            return data;
        });

        // Print analysis
        console.log('PAGE TITLE:');
        console.log(`  ${pageData.title}\n`);

        console.log(`TABLES FOUND: ${pageData.tables.length}`);
        pageData.tables.forEach(table => {
            console.log(`\nTable ${table.index}:`);
            console.log(`  Class: ${table.className}`);
            console.log(`  ID: ${table.id}`);
            console.log(`  Headers: ${table.headers.join(', ')}`);
            console.log(`  Row count: ${table.rowCount}`);
        });

        console.log(`\n\nLINKS TO MEETS/RESULTS: ${pageData.links.length}`);
        pageData.links.slice(0, 10).forEach(link => {
            console.log(`  ${link.text} → ${link.href}`);
        });

        console.log(`\n\nPAGE STRUCTURE (first 5 sections):`);
        pageData.structure.slice(0, 5).forEach(section => {
            console.log(`\nSection ${section.index}:`);
            console.log(`  Tag: ${section.tag}`);
            console.log(`  Class: ${section.className}`);
            console.log(`  ID: ${section.id}`);
            console.log(`  Preview: ${section.textPreview}...`);
        });

        // Take a screenshot for manual inspection
        await page.screenshot({ path: 'athletic-net-screenshot.png', fullPage: true });
        console.log('\n\n✅ Screenshot saved to: athletic-net-screenshot.png');

        // Get full HTML for inspection
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('athletic-net-page.html', html);
        console.log('✅ Full HTML saved to: athletic-net-page.html\n');

        return pageData;

    } catch (error) {
        console.error('Error analyzing page:', error);
    } finally {
        await browser.close();
    }
}

// Run the analysis
const schoolId = process.argv[2] || '1076';
const season = process.argv[3] || '2025';

analyzePage(schoolId, season)
    .then(() => {
        console.log('\nAnalysis complete!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
    });
