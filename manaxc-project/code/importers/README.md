# ManaXC Data Importers

Python scripts to import historical data from Excel files into Supabase.

## Setup

1. **Install dependencies:**
   ```bash
   cd /Users/ron/manaxc/manaxc-project/code/importers
   pip3 install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Get Supabase credentials:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Settings → API
   - Copy the URL and anon/public key

## Import Scripts

### 1. `import_courses.py`
Imports course data from "Master Courses" worksheet.

**What it does:**
- Reads Master Courses sheet
- Imports mile_difficulty ratings
- Creates course records with proper formatting

**Usage:**
```bash
python3 import_courses.py
```

### 2. `import_athletes.py`
Imports athlete data from "Master Athletes" worksheet.

**What it does:**
- Reads Master Athletes sheet
- Parses full names using `nameparser` library
- Handles complex names (Jr., III, O'Connor, de la Vega, etc.)
- Generates auto-slugs for URLs

**Usage:**
```bash
python3 import_athletes.py
```

### 3. `import_results.py`
Imports race results from "MasterResults" worksheet.

**What it does:**
- Reads MasterResults sheet (58 years of data)
- Converts times to centiseconds
- Marks all as `is_legacy_data = TRUE`
- Sets `data_source = 'excel_import'`
- Links to athletes, meets, courses

**Usage:**
```bash
python3 import_results.py
```

### 4. `import_all.py`
Runs all imports in correct order.

**Usage:**
```bash
python3 import_all.py
```

## Import Order

**IMPORTANT:** Run imports in this order to satisfy foreign key constraints:

1. Schools (if not already created)
2. Courses
3. Athletes
4. Meets
5. Races
6. Results

## Data Standards

All imports follow ManaXC data standards:

- **Times:** Stored as INTEGER centiseconds (19:30.45 = 117045)
- **Names:** Parsed with `nameparser` library
- **Legacy Data:** Marked with `is_legacy_data = TRUE`
- **Data Source:** Set to `'excel_import'`
- **Validation:** All imports validate before inserting

## Error Handling

- Duplicates are skipped (based on UNIQUE constraints)
- Invalid data is logged to `import_errors.log`
- Transactions used (all-or-nothing imports)
- Progress displayed during import

## Testing

Test imports with small datasets first:

```bash
# Import only first 10 rows (test mode)
python3 import_courses.py --limit 10
python3 import_athletes.py --limit 10
python3 import_results.py --limit 10
```
