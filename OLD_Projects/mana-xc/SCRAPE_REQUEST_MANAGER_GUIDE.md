# Scrape Request Manager Guide

**Created**: October 19, 2025
**Location**: `/admin/scrape-requests`
**Status**: Ready to use

---

## Overview

The **Scrape Request Manager** is a queue-based system for managing Athletic.net scraping jobs. Instead of manually running the scraper via Claude Code interface, admins can now use a web UI to queue multiple schools and seasons, then process them in batch.

---

## Features

### 1. Quick Action Buttons ⚡

Four preset buttons for common use cases:

| Button | What It Does | Years Scraped |
|--------|-------------|---------------|
| **Current Season** | Scrapes just the current year | 2025 |
| **Last 4 Years** | Common for 4-year athlete tracking | 2022-2025 |
| **Last 10 Years** | Comprehensive recent history | 2016-2025 |
| **All Available** | Everything Athletic.net has (from 2010) | 2010-2025 |

**How to use:**
1. Enter School ID (e.g., 1076 for Westmont)
2. Optionally enter School Name
3. Click a Quick Action button
4. Requests are added to queue automatically

### 2. Custom Range Entry 📅

For specific year ranges:

1. Enter School ID
2. Enter Start Year (e.g., 2018)
3. Enter End Year (e.g., 2023)
4. Click "Add Custom Range to Queue"
5. System creates one request per year in range

### 3. Auto-Import Toggle 🔄

- **Enabled** (default): Data automatically imports to database after scraping
- **Disabled**: Files are saved but not imported (you can import manually later)

### 4. Queue Management 📊

**Statistics Dashboard:**
- **Pending**: Requests waiting to run
- **Completed**: Successfully scraped and imported
- **Failed**: Errors during scraping

**Queue Controls:**
- **Run All Pending**: Process entire queue sequentially (3-second delay between scrapes)
- **Clear Completed**: Remove finished requests to clean up queue
- **Individual Controls**: Run or delete specific requests

### 5. Status Tracking 📈

Each request shows:
- **Status Icon**:
  - 🕐 Pending (gray clock)
  - ⚙️ Running (blue spinning loader)
  - ✅ Completed (green checkmark)
  - ❌ Failed (red alert)
- **School & Season**: "Westmont HS - 2024"
- **Results**: "5 new meets, 1,234 results" (when completed)
- **Download Links**: CSV and JSON files for each completed scrape

---

## Example Workflows

### Workflow 1: New School - Full History

**Goal**: Import all available data for a school

```
1. Go to /admin/scrape-requests
2. Enter School ID: 1076
3. Enter School Name: Westmont HS
4. Enable "Auto-import after scraping" ✅
5. Click "All Available" button
6. Confirm popup (16 seasons from 2010-2025)
7. Click "Run All Pending"
8. Wait ~10 minutes for all 16 seasons to complete
9. Done! Full history imported automatically
```

### Workflow 2: Update Current Season Weekly

**Goal**: Scrape latest meets for multiple schools every week

```
1. Enter first school ID, click "Current Season"
2. Enter second school ID, click "Current Season"
3. Enter third school ID, click "Current Season"
   (Now have 3 requests queued)
4. Click "Run All Pending"
5. All 3 schools' current seasons scraped and imported
6. Repeat next week to get new meets
```

### Workflow 3: 4-Year Athlete Progression

**Goal**: Track athletes over their high school career

```
1. Enter School ID
2. Click "Last 4 Years" button
   (Creates 4 requests: 2022, 2023, 2024, 2025)
3. Click "Run All Pending"
4. 4 years imported with graduation_year tracking
5. Athletes can now be tracked across all 4 years
```

### Workflow 4: Custom Historical Analysis

**Goal**: Analyze specific time period (e.g., 2015-2018)

```
1. Enter School ID
2. Set Start Year: 2015
3. Set End Year: 2018
4. Click "Add Custom Range to Queue"
5. Click "Run All Pending"
6. 4 seasons (2015-2018) scraped and imported
```

---

## Data Persistence

**Local Storage:**
- Queue is saved in browser's localStorage
- Survives page refresh and browser restart
- Each browser/computer has independent queue
- Clear completed requests to free up space

**File Storage:**
- CSV and JSON files saved to project root
- Files remain after clearing queue
- Can manually import later using `/admin/bulk-import`

---

## Rate Limiting & Best Practices

### Athletic.net Scraping Etiquette

**Automatic Delays:**
- 3 seconds between each scrape request
- Built-in to prevent overwhelming their servers

**Best Practices:**
- ✅ Run scrapes during off-peak hours (late evening)
- ✅ Use "All Available" sparingly (only for new schools)
- ✅ For updates, use "Current Season" instead of re-scraping everything
- ✅ Clear completed requests regularly
- ❌ Don't run multiple schools simultaneously (use queue instead)

**Duplicate Detection:**
- Scraper automatically skips meets already in database
- Athletic.net meet IDs are tracked to prevent duplicates
- Re-scraping same school/season won't create duplicates

---

## Comparison: New UI vs. Old Method

| Feature | Old (Claude Code Interface) | New (Scrape Request Manager) |
|---------|----------------------------|------------------------------|
| **Scrape one season** | `node scripts/athletic-net-scraper-v2.js 1076 2025` | Click "Current Season" |
| **Scrape 4 years** | Run command 4 times manually | Click "Last 4 Years" |
| **Scrape all time** | Run command 16 times manually | Click "All Available" |
| **Auto-import** | Manual step via bulk-import UI | Toggle checkbox |
| **Track progress** | Watch terminal output | Visual queue with status icons |
| **Batch multiple schools** | Requires scripting | Add to queue, click "Run All" |
| **Pause/Resume** | Not possible | Queue persists across sessions |

---

## Technical Details

### File Locations

**New Files Created:**
- `/app/admin/scrape-requests/page.tsx` - Route handler
- `/app/admin/dashboard/page.tsx` - Admin dashboard
- `/components/admin/ScrapeRequestManager.tsx` - Main component

**Existing Files Used:**
- `/api/admin/scrape-athletic-net` - Scraper API endpoint
- `/api/admin/batch-import` - Import API endpoint
- `/scripts/athletic-net-scraper-v2.js` - Underlying scraper script

### Data Flow

```
User clicks Quick Action
  ↓
Create ScrapeRequest objects (one per year)
  ↓
Add to queue (stored in localStorage)
  ↓
User clicks "Run All Pending"
  ↓
For each request:
  - Call /api/admin/scrape-athletic-net
  - Scraper runs (Puppeteer → Athletic.net)
  - CSV/JSON files saved to disk
  - If auto-import enabled:
    - Call /api/admin/batch-import
    - Data inserted to Supabase
  - Update request status (completed/failed)
  - Wait 3 seconds before next request
  ↓
Queue complete
```

---

## Troubleshooting

### "All Available" creates too many requests

**Solution**: The confirmation popup shows total count. If it's too many years:
- Cancel and use "Last 10 Years" instead
- Or use Custom Range with specific years

### Queue disappeared after closing browser

**Cause**: localStorage is browser-specific

**Solution**: Queue is still there, just refresh the page

### Import failed but scrape succeeded

**Check**:
1. Are CSV/JSON files in project root? (Download links should work)
2. Try manual import via `/admin/bulk-import`
3. Check browser console for error details

### Scraper timeout or hanging

**Cause**: Athletic.net may be slow or blocking requests

**Solution**:
1. Wait and try again later
2. Reduce batch size (don't run 16 years at once)
3. Check if Athletic.net has data for that school/year

---

## Future Enhancements (Planned)

- [ ] **Auto-detect available years** - Query Athletic.net to find actual range
- [ ] **School favorites** - Save frequently scraped schools
- [ ] **Scheduled scrapes** - Cron job for weekly updates
- [ ] **Email notifications** - Alert when queue completes
- [ ] **Progress percentage** - Show detailed scrape progress
- [ ] **Pause/Resume queue** - Stop processing mid-way
- [ ] **Queue presets** - Save common configurations

---

## Quick Start Examples

### Example 1: Westmont HS (4 years)

```
School ID: 1076
School Name: Westmont HS
Click: "Last 4 Years"
Result: 4 requests created (2022-2025)
```

### Example 2: Multiple Schools (Current Season)

```
1. Enter 1076, click "Current Season"
2. Enter 1234, click "Current Season"
3. Enter 5678, click "Current Season"
Result: 3 requests queued
Click "Run All Pending" to scrape all 3
```

### Example 3: Historical Research (2010-2015)

```
School ID: 1076
Start Year: 2010
End Year: 2015
Click: "Add Custom Range to Queue"
Result: 6 requests created (2010-2015)
```

---

**Access**: `http://localhost:3000/admin/scrape-requests`

**Dashboard**: `http://localhost:3000/admin/dashboard`

**Status**: Ready for production use 🚀
