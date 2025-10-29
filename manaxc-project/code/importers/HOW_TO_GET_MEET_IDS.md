# How to Get Meet IDs for Import

## Overview

The `get_meet_ids.py` script extracts all meet IDs from Athletic.net school pages. You can then import these meets one at a time using your admin UI.

## Current Status

- **Westmont** (ID: 1076) - DONE ✅ - Found 5 meets

## How to Add More Schools

### Step 1: Find School IDs on Athletic.net

For each school you want to add:

1. Go to https://www.athletic.net
2. Search for the school name (e.g., "Leland High School CA")
3. Click on the school in the search results
4. Look at the URL in your browser - it will be something like:
   ```
   https://www.athletic.net/CrossCountry/School.aspx?SchoolID=12345
   ```
5. Copy the number after `SchoolID=` (in this example: `12345`)

### Step 2: Add School IDs to the Script

Edit `get_meet_ids.py` and add the school IDs to the `school_ids` dictionary:

```python
school_ids = {
    # STAL Schools
    "Westmont": "1076",        # Already done
    "Andrew Hill": "12345",    # Replace with actual ID
    "Mt. Pleasant": "67890",   # Replace with actual ID
    "Pioneer": "11111",        # Replace with actual ID

    # Add more schools here...
}
```

### Step 3: Run the Script

```bash
venv/bin/python3 get_meet_ids.py
```

The script will:
- Visit each school's Athletic.net page
- Extract all meet IDs
- Remove duplicates
- Save results to `meet_ids_to_import.json`
- Print a list of URLs for each meet

### Step 4: Import Meets

Use your admin UI to import each meet one at a time using the URLs or meet IDs from the output.

## Schools to Process

### Section 1: STAL Schools (6 schools)
- [ ] Andrew Hill
- [ ] Independence
- [ ] Mt. Pleasant
- [ ] Pioneer
- [ ] Silver Creek
- [x] Westmont (ID: 1076) - 5 meets found

### Section 2: Additional BVAL Schools (20 schools)
- [ ] Branham
- [ ] Christopher
- [ ] Del Mar
- [ ] Evergreen Valley
- [ ] Gilroy
- [ ] Gunderson
- [ ] James Lick
- [ ] Leigh
- [ ] Leland
- [ ] Lincoln
- [ ] Live Oak
- [ ] Oak Grove
- [ ] Overfelt
- [ ] Piedmont Hills
- [ ] Prospect
- [ ] San Jose High
- [ ] Santa Teresa
- [ ] Sobrato
- [ ] Willow Glen
- [ ] Yerba Buena

### Section 3: Additional D2 Schools (16 schools)
- [ ] Aragon
- [ ] Archbishop Mitty
- [ ] Cupertino
- [ ] Everett Alvarez
- [ ] Fremont
- [ ] Gunn
- [ ] Junipero Serra
- [ ] Los Gatos
- [ ] Lynbrook
- [ ] Mountain View
- [ ] Palo Alto
- [ ] Rancho San Juan
- [ ] Saint Francis
- [ ] Santa Clara
- [ ] Sequoia
- [ ] Woodside

## Tips

- Start with just a few key schools from each section (e.g., one STAL, one BVAL, one D2)
- Athletic.net search works better with "High School" suffix and state (e.g., "Leland High School CA")
- The school IDs are stable and won't change
- You can run the script multiple times - it will only process schools that have IDs filled in

## Current Output

Latest run found **5 unique meets** from Westmont:

1. Meet 254429 - https://www.athletic.net/CrossCountry/meet/254429
2. Meet 254535 - https://www.athletic.net/CrossCountry/meet/254535
3. Meet 265306 - https://www.athletic.net/CrossCountry/meet/265306
4. Meet 267582 - https://www.athletic.net/CrossCountry/meet/267582
5. Meet 270614 - https://www.athletic.net/CrossCountry/meet/270614
