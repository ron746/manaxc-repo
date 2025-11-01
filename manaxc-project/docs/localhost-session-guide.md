# ManaXC Localhost Development Session Guide

## Quick Reference

**Start Development**: `npm run dev` from `/website` directory
**Stop Development**: `Ctrl+C` in terminal, then cleanup background processes
**Default URL**: http://localhost:3000

---

## Starting a Localhost Session

### Step 1: Navigate to Project Directory
```bash
cd /Users/ron/manaxc/manaxc-project/website
```

### Step 2: Check for Port Conflicts (Optional but Recommended)
Before starting, verify port 3000 is available:
```bash
lsof -i :3000
```

**If port is in use:**
```bash
# Kill the process using port 3000
kill -9 $(lsof -t -i:3000)
```

### Step 3: Start Next.js Development Server
```bash
npm run dev
```

**Expected Output:**
```
> website@0.1.0 dev
> next dev

  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.5s
```

### Step 4: Verify Server is Running
Open your browser and navigate to:
```
http://localhost:3000
```

You should see the ManaXC homepage.

### Step 5: Verify Database Connection (Optional)
The app connects to Supabase automatically using credentials in `.env.local`. If you see data loading on the homepage, the connection is working.

---

## Working During Development Session

### Hot Reload
- Next.js automatically reloads when you save files
- Changes to `/app` directory trigger fast refresh
- Changes to `/components` trigger fast refresh
- Changes to `tailwind.config.js` may require manual refresh

### Console Monitoring
Keep an eye on the terminal for:
- Compilation errors
- Runtime errors
- API endpoint logs
- Database query logs

### Common Issues During Development

**Issue**: "Module not found" error
**Fix**:
```bash
npm install
npm run dev
```

**Issue**: "Port 3000 already in use"
**Fix**:
```bash
kill -9 $(lsof -t -i:3000)
npm run dev
```

**Issue**: Environment variables not loading
**Fix**:
```bash
# Stop server (Ctrl+C)
# Verify .env.local exists
ls -la .env.local
# Restart server
npm run dev
```

---

## Properly Shutting Down a Session

Follow these steps IN ORDER to cleanly shut down your development environment:

### Step 1: Stop Next.js Dev Server
In the terminal running `npm run dev`:
```
Press Ctrl+C
```

**Wait for graceful shutdown message:**
```
^C
> Gracefully shutting down. Please wait...
```

### Step 2: Check for Lingering Node Processes
```bash
ps aux | grep node
```

**If you see node processes still running:**
```bash
# Kill specific process by PID
kill -9 <PID>

# OR kill all node processes (use with caution)
killall -9 node
```

### Step 3: Check for Background Python Processes
If you were running imports or scrapers:
```bash
ps aux | grep python
```

**Kill background Python processes:**
```bash
# List all background jobs in current shell
jobs -l

# Kill specific job by number
kill %1

# OR kill all Python processes (use with caution)
killall -9 python3
```

### Step 4: Verify Port 3000 is Released
```bash
lsof -i :3000
```

**Expected output:** Nothing (port is free)

**If port is still in use:**
```bash
kill -9 $(lsof -t -i:3000)
```

### Step 5: Check Database Connections (Optional)
```bash
# Verify no hanging database connections
ps aux | grep postgres
```

Supabase connections are cloud-based, so local cleanup usually isn't needed.

### Step 6: Clean Up Temporary Files (Optional)
```bash
# Remove Next.js build cache if needed
rm -rf .next

# Remove node_modules if experiencing persistent issues
rm -rf node_modules
npm install
```

---

## Complete Shutdown Checklist

Use this checklist to ensure clean shutdown:

- [ ] Pressed Ctrl+C in terminal running `npm run dev`
- [ ] Waited for "Gracefully shutting down" message
- [ ] Checked for lingering node processes: `ps aux | grep node`
- [ ] Checked for background Python processes: `ps aux | grep python`
- [ ] Verified port 3000 is free: `lsof -i :3000`
- [ ] Killed any remaining processes if found
- [ ] Saved all code changes in editor
- [ ] Committed important changes to git (if desired)

---

## Emergency Full Cleanup

If your development environment is stuck or behaving unexpectedly:

```bash
# Kill all node processes
killall -9 node

# Kill all Python processes
killall -9 python3

# Kill anything on port 3000
kill -9 $(lsof -t -i:3000)

# Navigate to project
cd /Users/ron/manaxc/manaxc-project/website

# Clean rebuild
rm -rf .next
npm install
npm run dev
```

---

## Background Process Management

### Checking Running Background Jobs

**In current shell:**
```bash
jobs -l
```

**System-wide:**
```bash
# All node processes
ps aux | grep node

# All Python processes
ps aux | grep python

# All processes using port 3000
lsof -i :3000
```

### Killing Background Jobs

**By job number (current shell):**
```bash
kill %1    # Kill job 1
kill %2    # Kill job 2
```

**By process ID:**
```bash
kill -9 <PID>
```

**All of a type:**
```bash
killall -9 node      # All node processes
killall -9 python3   # All Python processes
```

---

## Troubleshooting Common Startup Issues

### Error: "EADDRINUSE: address already in use"
**Cause**: Port 3000 is occupied by another process
**Fix**:
```bash
kill -9 $(lsof -t -i:3000)
npm run dev
```

### Error: "Cannot find module"
**Cause**: Missing npm dependencies
**Fix**:
```bash
npm install
npm run dev
```

### Error: "Invalid environment variables"
**Cause**: Missing or malformed `.env.local` file
**Fix**:
```bash
# Check if file exists
ls -la .env.local

# Verify it contains required variables
cat .env.local | grep NEXT_PUBLIC_SUPABASE
```

**Required variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Browser Shows "This site can't be reached"
**Cause**: Dev server not running or wrong URL
**Fix**:
1. Check terminal for "Ready in X.Xs" message
2. Verify URL is exactly `http://localhost:3000`
3. Try `http://127.0.0.1:3000` as alternative

### Changes Not Appearing in Browser
**Cause**: Browser cache or HMR issue
**Fix**:
1. Hard refresh: `Cmd+Shift+R`
2. Clear cache and reload
3. Restart dev server (Ctrl+C, then `npm run dev`)

---

## Performance Tips for Development

### Faster Startup
```bash
# Use turbopack (experimental but faster)
npm run dev -- --turbo
```

### Reduce Memory Usage
```bash
# Limit max memory for node
NODE_OPTIONS='--max-old-space-size=4096' npm run dev
```

### Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

---

## Git Integration Before Shutdown

### Quick Commit Before Ending Session
```bash
# Check status
git status

# Add all changes
git add .

# Commit with message
git commit -m "Session work: [brief description]"

# Push to remote (optional)
git push
```

---

## File Location

This guide is located at:
```
/Users/ron/manaxc/manaxc-project/docs/localhost-session-guide.md
```

---

## Quick Command Reference

| Task | Command |
|------|---------|
| Start dev server | `cd /Users/ron/manaxc/manaxc-project/website && npm run dev` |
| Stop dev server | `Ctrl+C` |
| Check port 3000 | `lsof -i :3000` |
| Kill port 3000 | `kill -9 $(lsof -t -i:3000)` |
| List node processes | `ps aux \| grep node` |
| Kill all node | `killall -9 node` |
| List Python processes | `ps aux \| grep python` |
| Kill all Python | `killall -9 python3` |
| Check background jobs | `jobs -l` |
| Clean rebuild | `rm -rf .next && npm install && npm run dev` |

---

**Last Updated**: 2025-11-01
**Project**: ManaXC
**Platform**: MacBook Air (macOS)
