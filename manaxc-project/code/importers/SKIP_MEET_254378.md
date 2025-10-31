# Skip Meet 254378 - State Championship

## Issue
Meet 254378 (state championship) causes import failures due to:
- **4,654 results** (very large meet)
- **All athletes have empty `athletic_net_id` fields**
- Causes 4,654 individual database lookups
- Import takes 15+ minutes with no progress before timing out

## Meet Details
- **Meet ID**: 254378
- **Type**: State Championship
- **Results**: 4,654 individual results
- **Schools**: Schools from across California (Ontario, Rio Mesa, Claremont, Canyon, Newbury Park, etc.)
- **Issue**: Scraper didn't populate athletic_net_ids for any athletes

## Why This Happens
State championship meets include schools from outside our typical leagues (BVAL/STAL). The scraper may not have full athlete data for schools it hasn't seen before, resulting in empty athletic_net_ids.

## Impact
When athletic_net_id is empty, the import must look up each athlete individually by:
- first_name + last_name + school_id + grad_year

This causes extremely slow lookups for 4,654 athletes.

## Solution
**Skip this meet** for now. It's not a BVAL/STAL league meet and the data quality issues make it unsuitable for import.

## How to Skip
If the meet appears in the bulk import loop, the import will fail and move on to the next meet. No action needed - the import process already handles failures gracefully.

## Future Improvement
To import state championship meets:
1. Pre-populate athletic_net_ids by scraping athlete profiles first
2. Add batch athlete lookup optimization
3. Or focus only on BVAL/STAL league meets
