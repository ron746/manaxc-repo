# Next Sprint Priorities
**Created:** October 29, 2025

## Critical Issues (P0)
1. **Fix Orphaned References in athlete_best_times**
   - Status: Script created (`FIX_ORPHANED_REFERENCES.py`)
   - Impact: Blocking 99%+ of result imports
   - Next: Run fix script, then re-import meet 254032
   - See: `code/importers/IMPORT_ISSUE_SUMMARY.md`

2. **Finish Importing All Pending Results**
   - After fixing orphaned references issue
   - Import all meets in `to-be-processed/` folder
   - Verify all results imported successfully

## High Priority Features (P1)

### Data Management
3. **Create Ability to Test for Duplicate Athletes**
   - UI tool to search for potential duplicate athlete records
   - Show matching criteria (name + school + grad year)
   - Provide merge functionality

4. **Create Way to Delete a Result**
   - Admin UI for deleting individual results
   - Cascade considerations for athlete_best_times
   - Audit logging

5. **Create Way to Delete a Race**
   - Admin UI for deleting races
   - Cascade delete all associated results
   - Confirm dialog with count of affected records

6. **Create Way to Delete a Meet**
   - Admin UI for deleting entire meets
   - Cascade delete all races and results
   - Confirm dialog with full impact summary

7. **Mark a Time as Unofficial**
   - Add `is_unofficial` flag to results table
   - Filter unofficial times from records/rankings
   - Show in UI with indicator

### Page Fixes
8. **Fix the Seasons Page**
   - Current issue: [Document specific issue]
   - Expected behavior: [Document expected behavior]

9. **Fix the Maintenance Page**
   - Current issue: [Document specific issue]
   - Expected behavior: [Document expected behavior]

### Import System Improvements
10. **Import Only One File at a Time Using the UI**
    - Currently imports entire directories
    - Add UI to select specific CSV files
    - Allow selective import (e.g., only results.csv)

11. **Find Out Why Intrasquad is Not a Valid Meet**
    - Investigation task
    - Check meet type validation rules
    - Determine if intentional or bug

## Technical Debt
- **Improve logging across all import scripts**
  - Add structured logging with timestamps
  - Log levels (DEBUG, INFO, WARNING, ERROR)
  - Separate log files per import run

- **Add proper error handling in UI**
  - Toast notifications for all operations
  - Detailed error messages
  - Retry mechanisms

## Notes
- All admin delete operations should be behind authentication
- Consider soft deletes vs hard deletes for audit trail
- Add confirmation dialogs for all destructive operations
- Log all admin actions to audit table

---
**See also:**
- `code/importers/IMPORT_ISSUE_SUMMARY.md` - Current import blocking issue
- `docs/mvp-specifications.md` - Original specifications
- `SESSION_HANDOFF_2025-10-28.md` - Previous session notes
