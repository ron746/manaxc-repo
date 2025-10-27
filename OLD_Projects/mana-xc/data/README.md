# Data Directory

This directory contains all scraped data files and imports.

## Directory Structure

```
data/
├── imports/
│   └── 2024-test/          # Test import files from initial analysis
│       ├── athletic-net-1076-2024.csv
│       ├── athletic-net-1076-2024.json
│       ├── athletic-net-1076-2025.csv
│       └── athletic-net-1076-2025.json
└── testing-archive/        # Old test files from early development
    ├── 2025_0911_STAL_test.csv
    ├── test-parser.js
    ├── all-results-*.json/html/png
    ├── athletic-net-*.html/png
    └── meet-*.html/png
```

## Usage

### Current Import Files

When you scrape new seasons, files will be created in the root `/Users/ron/mana-xc` directory:
- `athletic-net-{schoolId}-{year}.csv`
- `athletic-net-{schoolId}-{year}.json`

These are temporary and will be used for import via the bulk import UI.

### Archive Policy

After successful import and verification, move data files to appropriate subdirectories:
- Test imports → `data/imports/YYYY-test/`
- Production imports → `data/imports/YYYY-production/`

## File Formats

### CSV Format
- Column headers match Athletic.net export format
- Time in both original format and centiseconds
- Used by bulk import UI

### JSON Format
- Structured meet → races → results hierarchy
- Contains metadata (school ID, scrape date)
- Used by batch import API
