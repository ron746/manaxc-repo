# End of Session Jobs

**Purpose**: This checklist ensures consistent session closure, protects against AI memory limitations, maintains project organization, and prepares for the next session.

**When to Use**: At the end of every coding session with Claude Code

---

## 1. Background Process Management

### Check for Running Processes
```bash
# Check for active localhost servers
lsof -i :3000 -i :3001 -i :8000 -i :8080 -i :5000 2>/dev/null | grep LISTEN

# Check for any hanging Node processes
ps aux | grep node | grep -v grep

# Check for Python/other dev servers
ps aux | grep python | grep -v grep
```

### User Decision Required
**Ask**: "I found the following processes running:
- [List processes with PIDs and ports]

Would you like me to:
1. **Keep them running** (you can continue working outside chat)
2. **Kill them** (clean shutdown)
3. **Leave decision to you** (I'll document them)

Which option would you prefer?"

---

## 2. Git Status & Code Changes

### Review What Changed
```bash
# Check current git status
git status

# Show detailed diff
git diff

# Check for untracked files
git ls-files --others --exclude-standard
```

### Stage Changes
```bash
# Add all changes (or be selective)
git add .

# Review staged changes
git diff --staged
```

---

## 3. Documentation Updates

### Update CLAUDE_PROMPT.md
**Location**: `/Users/ron/manaxc/manaxc-project/website/CLAUDE_PROMPT.md`

**Required Sections to Update**:
1. **Last Sprint Summary** - Date and what was accomplished
2. **What Was Accomplished** - Bullet points of features/fixes
3. **Files Modified** - List all changed files
4. **Technical Implementation Details** - Key code patterns/formulas
5. **Known Issues** - Any bugs or concerns raised
6. **Next Sprint Priorities** - What should be tackled next
7. **Recent Commits** - Update with new commit hash

### Check for Project-Specific Docs
```bash
# Look for other markdown files that may need updates
find . -name "*.md" -not -path "*/node_modules/*" -type f
```

Common files to update:
- `README.md` - If major features added
- `CHANGELOG.md` - If exists
- `TODO.md` - If exists
- Feature-specific docs in `/docs` folder

---

## 4. Session Summary Creation

### Document Key Accomplishments
Create a structured summary:

```markdown
## Session Date: [YYYY-MM-DD]

### Features Completed
- [ ] Feature 1: Brief description
- [ ] Feature 2: Brief description

### Bugs Fixed
- [ ] Bug 1: Description and solution
- [ ] Bug 2: Description and solution

### Code Changes
**Modified Files:**
- `path/to/file1.tsx` - What changed
- `path/to/file2.tsx` - What changed

**Key Functions/Components:**
- `functionName()` - What it does now
- `ComponentName` - Changes made

### Technical Decisions
- **Decision 1**: Why we chose approach X over Y
- **Decision 2**: Formula/algorithm explanation

### Performance/UX Improvements
- Improvement 1
- Improvement 2
```

---

## 5. Critical Notes & Warnings

### Document Important Context

**Create/Update Notes in**:
- Code comments for complex logic
- Inline documentation for formulas
- Warning comments for "gotchas"

**Example Critical Notes**:
```typescript
// CRITICAL: This normalized_time_cs calculation must match the database
// Formula: pace_per_mile * difficulty_rating * distance_in_miles
// See CLAUDE_PROMPT.md for full explanation

// WARNING: Do not change this order - UI depends on sorting by this field
```

---

## 6. Folder Cleanup

### Check for Temporary Files
```bash
# Find temp files
find . -name "*.tmp" -o -name "*.log" -o -name ".DS_Store" | grep -v node_modules

# Find debug scripts
find /tmp -name "*manaxc*" -o -name "*debug*" 2>/dev/null

# Check for screenshot temp files
find /var/folders -name "Screenshot*" 2>/dev/null | head -5
```

### Organize Project Structure
Ensure proper organization:
- `/components` - React components
- `/lib` - Utility functions, queries
- `/app` - Next.js pages
- `/public` - Static assets
- `/docs` - Documentation
- Root level - Config files only

### Remove Unused Files
Ask: "Should I remove any of these files?
- [List potentially unused files]
- Old debug scripts
- Temporary screenshots
- Outdated documentation"

---

## 7. Sprint Planning Questions

### User Questions for Next Sprint

**Priority Assessment**:
1. "What are the TOP 3 priorities for the next session?"
2. "Are there any blocking issues preventing progress?"
3. "Any features that users are waiting for?"

**Technical Debt**:
4. "Should we address any of these technical items?
   - Remove debug logging
   - Refactor duplicated code
   - Add tests
   - Performance optimization"

**Data/Content**:
5. "Do we need to import more data before next session?"
6. "Any database migrations needed?"

**UI/UX Polish**:
7. "Any UI refinements or styling issues to address?"
8. "Any user feedback to incorporate?"

**Documentation**:
9. "Do you need any user guides or admin documentation?"

---

## 8. Commit & Push Strategy

### Commit Message Format
```
<type>: <short summary>

<detailed description>

Key changes:
- Change 1
- Change 2
- Change 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

### Push to Remote
```bash
# Ensure we're on correct branch
git branch --show-current

# Push changes
git push origin main

# Verify push
git log origin/main..HEAD
```

---

## 9. Pre-Close Verification Checklist

- [ ] All running processes documented (keep/kill decision made)
- [ ] Git status clean (all changes committed) or documented reason for uncommitted changes
- [ ] CLAUDE_PROMPT.md updated with session summary
- [ ] Critical code has inline comments/documentation
- [ ] Known issues documented in CLAUDE_PROMPT.md
- [ ] Next sprint priorities clearly listed
- [ ] User questions asked about priorities
- [ ] Temporary files cleaned up or documented
- [ ] Changes pushed to remote repository
- [ ] No TypeScript/ESLint errors left unaddressed

---

## 10. Handoff Notes

### For Next Session

**Quick Start Commands**:
```bash
cd /Users/ron/manaxc/manaxc-project/website
git pull
npm install  # If package.json changed
npm run dev
```

**Where We Left Off**:
- Last file edited: [filename]
- Next task: [description]
- Blocked by: [any blockers]

**Important Context**:
- Any half-finished features
- Decisions pending user feedback
- Tests that need to be run
- Database state changes made

---

## Customization Notes

**Project-Specific Additions**:
- Add project-specific checks here
- Custom deployment steps
- Special testing procedures
- Client communication needs

**Team Conventions**:
- Commit message format preferences
- Documentation standards
- Code review requirements
- Deployment approval process

---

**Last Updated**: 2025-10-31
**Maintained By**: Claude Code & Project Team
**Version**: 1.0
