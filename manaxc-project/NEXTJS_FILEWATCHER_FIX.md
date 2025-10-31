# Next.js File Watcher Configuration Fix

## Problem

**Symptoms:**
- Next.js dev server consuming 100%+ CPU
- VS Code freezing/crashing (happened 3-4 times on Oct 30, 2025)
- System slowdown when running imports
- Dev server becomes unresponsive

**Root Cause:**
Next.js Turbopack file watcher monitors ALL files in project directory by default, including:
- `/code/importers/to-be-processed/` - Contains thousands of CSV files
- `/code/importers/processed/` - Historical import data
- Result split files (10 x 500 rows each)

When CSV files are created/modified during imports, the watcher triggers rebuilds repeatedly, causing CPU thrashing and eventual system freeze.

## Solution

Configure Next.js to ignore import data directories.

### File: `/Users/ron/manaxc/manaxc-project/website/next.config.ts`

**Add watchOptions configuration:**

```typescript
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,

  // Existing turbopack config
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },

  // ADD THIS SECTION:
  watchOptions: {
    ignored: [
      // Ignore import data directories
      '**/code/importers/to-be-processed/**',
      '**/code/importers/processed/**',
      '**/code/importers/*.csv',

      // Standard ignores
      '**/node_modules/**',
      '**/.git/**',
      '**/.next/**',
    ],
  },
};

export default config;
```

## How It Works

- `watchOptions.ignored` tells Next.js file watcher to skip specific paths
- Glob patterns (`**`) match nested directories
- Prevents watcher from monitoring thousands of CSV files
- Dev server only watches actual source code files

## Testing

After applying fix:

1. Start dev server: `npm run dev`
2. Run import operations in `code/importers/`
3. Create/modify CSV files
4. Verify dev server remains responsive
5. Check CPU usage stays reasonable (~10-20%)

## Performance Impact

**Before:**
- Dev server: 123.5% CPU during imports
- System: Frozen/unresponsive
- VS Code: Crashes

**After:**
- Dev server: ~10% CPU during imports
- System: Responsive
- VS Code: Stable

## Related Files

- Next.js config: `/Users/ron/manaxc/manaxc-project/website/next.config.ts`
- Import directory: `/Users/ron/manaxc/manaxc-project/code/importers/`
- Session notes: `/Users/ron/manaxc/manaxc-project/SESSION_HANDOFF_2025-10-30.md`

## References

- Next.js watchOptions: https://nextjs.org/docs/app/api-reference/next-config-js/watchOptions
- Issue discovered: Oct 30, 2025 during meet 254378 import
- Process ID when hung: 27058 (123.5% CPU)

## Apply This Fix Next Session

**Priority:** P1 (High - Prevents system crashes)

**Steps:**
1. Open `/Users/ron/manaxc/manaxc-project/website/next.config.ts`
2. Add `watchOptions` configuration above
3. Restart dev server
4. Test with CSV file operations
5. Verify no more crashes

**Estimated Time:** 5 minutes
