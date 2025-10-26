# Research Summary: Data Sources & Name Parsing
**Research Date:** October 22, 2025  
**Researcher:** Claude (via web search)

---

## 1. MileSplit API Investigation

### API Availability
MileSplit does provide an API at `api.milesplit.com` but with significant restrictions.

### Terms of Service & Restrictions
From MileSplit Developer documentation (2010):

**YOU MAY:**
- Identify that data is supplied by MileSplit
- Use MileSplit logos with proper attribution
- Store name and ID references (with temporary caching)

**YOU MAY NOT:**
- Sell or charge for access to API data
- Re-distribute or syndicate the API for use by others
- Store or scrape any of the data (except name/ID references)
- Reverse engineer or hack API methods
- Use without conspicuous attribution to MileSplit

**Rate Limits:**
- MileSplit may impose rate limits on services or IPs that access large amounts of data
- They can change terms of service at any time

### API Response Format
The API supports:
- JSON responses
- JSONP with callbacks for cross-domain requests
- Pagination with `limit` and `offset` parameters
- Field selection via `fields` parameter

Example API call:
```
http://api.milesplit.com/test/echo/Hello+World.json?callback=receiveResponse
```

Example Response Object:
```json
{
  "ID": "25",
  "FirstName": "Matt",
  "City": "St. Petersburg",
  "State": "FL"
}
```

### Alternative: Google Sheets Submission Format
MileSplit accepts meet results via standardized Google Sheets with this format:
1. Meet date, host school, venue/course
2. Athlete's first name, last name, school, time (mm:ss.ms format)
3. Email submission to state coordinators

**States observed:** Connecticut, Massachusetts (likely all states have similar process)

### Real-World Scraping Examples
A high school coach documented scraping MileSplit in 2016:
- Used Selenium WebDriver
- Implemented respectful rate limiting (3-4 second delays)
- Built URL patterns: `http://{state}.milesplit.com/rankings/events/high-school-{gender}/cross-country/5000m?year={year}&page={page}`
- Successfully scraped 110MB of data
- Developer felt less guilty because they had a paid subscription

### RaceTab Integration
- RaceTab is timing software that can upload to MileSplit
- Uses MileSplit's "Live Results" API
- Can download meet data from MileSplit by date and state
- Suggests MileSplit has backend systems for meet data exchange

---

## 2. Name Parsing Solution: `nameparser` Library

### Library Details
- **Package:** `nameparser` (https://pypi.org/project/nameparser/)
- **Python Support:** 3.2+ and 2.6+
- **GitHub:** https://github.com/derek73/python-nameparser
- **License:** LGPL (open source)

### Installation
```bash
pip install nameparser
```

### Core Functionality
Parses human names into components:
- `title` (Dr., Mr., Mrs., etc.)
- `first` (first name)
- `middle` (middle name(s))
- `last` (last name including prefixes like "de la", "van")
- `suffix` (Jr., III, PhD, etc.)
- `nickname` (nicknames in quotes or parentheses)
- `surnames` (middle + last combined)
- `initials` (first initial of each name part)

### Supported Name Formats

**Standard Format:**
```
Title Firstname "Nickname" Middle Middle Lastname Suffix
```

**Comma-Separated Format:**
```
Lastname [Suffix], Title Firstname (Nickname) Middle Middle[,] Suffix [, Suffix]
Title Firstname M Lastname [Suffix], Suffix [Suffix] [, Suffix]
```

### Usage Examples

**Example 1: Complex Name**
```python
from nameparser import HumanName

name = HumanName("Dr. Juan Q. Xavier de la Vega III (Doc Vega)")
print(name)
# <HumanName : [
#   title: 'Dr.'
#   first: 'Juan'
#   middle: 'Q. Xavier'
#   last: 'de la Vega'
#   suffix: 'III'
#   nickname: 'Doc Vega'
# ]>

print(name.last)  # 'de la Vega'
print(name.first) # 'Juan'
```

**Example 2: Simple Name**
```python
name = HumanName("Sarah Simpson")
print(name.first)  # 'Sarah'
print(name.last)   # 'Simpson'
```

**Example 3: Name with Suffix**
```python
name = HumanName("D.J. Richies III")
print(name.first)  # 'D.J.'
print(name.last)   # 'Richies'
print(name.suffix) # 'III'
```

**Example 4: Comma-Separated (Last, First)**
```python
name = HumanName("Van Der Berg, John Q.")
print(name.first)  # 'John'
print(name.middle) # 'Q.'
print(name.last)   # 'Van Der Berg'
```

**Example 5: Irish Names with Apostrophes**
```python
name = HumanName("Sean O'Connor")
print(name.first)  # 'Sean'
print(name.last)   # "O'Connor"
```

### String Formatting
```python
name = HumanName("Dr. Juan Q. Xavier de la Vega III")
name.string_format = "{first} {last}"
print(str(name))  # 'Juan de la Vega'

# Or as dictionary
print(name.as_dict())
# {
#   'last': 'de la Vega',
#   'suffix': 'III',
#   'title': 'Dr.',
#   'middle': 'Q. Xavier',
#   'nickname': '',
#   'first': 'Juan'
# }
```

### Using with Pandas DataFrames
```python
from nameparser import HumanName
from operator import attrgetter
import pandas as pd

# Extract first names from a DataFrame column
df['first_name'] = df.full_name.apply(HumanName).apply(attrgetter('first'))
df['last_name'] = df.full_name.apply(HumanName).apply(attrgetter('last'))
```

### Customization Options
The library allows customization of:
- Pre-defined sets of titles
- Prefix handling
- Suffix lists
- Capitalization correction

You can subclass `HumanName` for custom behavior.

### Known Limitations
- Does not attempt to correct mistakes in input
- Primarily splits on white space
- Best for Western name formats
- May struggle with non-Western naming conventions (e.g., Asian names where family name comes first)

### Handling Edge Cases
```python
# Names with multiple parts
name = HumanName("John Jacob Jingleheimer Schmidt")
print(name.first)   # 'John'
print(name.middle)  # 'Jacob Jingleheimer'
print(name.last)    # 'Schmidt'

# Single names (mononyms)
name = HumanName("Cher")
print(name.first)   # 'Cher'
print(name.last)    # ''
```

---

## 3. Recommendations for Mana XC

### For MileSplit Integration

**Short Term:**
- Do NOT attempt to scrape MileSplit API directly (TOS violation)
- Design database schema to accept MileSplit's Google Sheets format
- Allow coaches to manually import MileSplit data via CSV upload

**Long Term:**
- Reach out to MileSplit about partnership opportunities
- Explore if they offer data licensing for legitimate use cases
- Consider building complementary features that don't compete with MileSplit

### For Name Parsing

**Implementation:**
```python
# Install the library
pip install nameparser

# Use in your scraper/importer
from nameparser import HumanName

def parse_athlete_name(full_name):
    """Parse full name into first and last name components."""
    name = HumanName(full_name)
    
    return {
        'first_name': name.first,
        'last_name': name.last,
        'middle_name': name.middle,
        'suffix': name.suffix,
        'full_name_normalized': f"{name.first} {name.last}".strip()
    }

# Usage in import pipeline
athlete_data = parse_athlete_name("John Q. Van Der Berg Jr.")
# Returns:
# {
#   'first_name': 'John',
#   'last_name': 'Van Der Berg',
#   'middle_name': 'Q.',
#   'suffix': 'Jr.',
#   'full_name_normalized': 'John Van Der Berg'
# }
```

**Database Schema Consideration:**
```sql
CREATE TABLE athletes (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    suffix VARCHAR(20),
    full_name_original TEXT,  -- Store original as scraped
    -- ... other fields
);
```

### For Athletic.net Scraping

**Best Practices (based on real-world examples):**
1. Implement 3-4 second delays between requests
2. Use Puppeteer or Selenium for dynamic content
3. Build respectful scrapers that don't overload their servers
4. Consider getting a paid Athletic.net account for legitimacy
5. Log all scraping activities for debugging
6. Implement error handling and retry logic
7. Store raw HTML/data before parsing (for re-processing if needed)

**URL Patterns (Athletic.net):**
- Study the site structure
- Build parameterized URLs for meets, schools, athletes
- Implement incremental scraping (only new data)

---

## 4. Next Research Tasks

### Immediate
- [ ] Test `nameparser` library with sample XC athlete names
- [ ] Document Athletic.net URL patterns and data structure
- [ ] Design database schema for course ratings and versioning
- [ ] Create import validation rules to prevent data quality issues

### Future
- [ ] Investigate college recruiting platforms (TFRRS integration?)
- [ ] Research weather API for race condition tracking
- [ ] Explore timing software integrations (RaceTab, FinishLynx)
- [ ] Study course difficulty algorithms (Elo rating, statistical models)

---

## 5. References & Links

### MileSplit
- Developer Blog: https://milesplit.wordpress.com/about/getting-started/
- Main Site: https://www.milesplit.com/
- Example State Sites: https://ca.milesplit.com/, https://ct.milesplit.com/

### Nameparser
- PyPI: https://pypi.org/project/nameparser/
- GitHub: https://github.com/derek73/python-nameparser
- Stack Overflow Examples: Multiple threads with real-world usage

### Athletic.net
- Main Site: https://www.athletic.net/
- (Scraping patterns to be documented after analysis)

---

**End of Research Document**
