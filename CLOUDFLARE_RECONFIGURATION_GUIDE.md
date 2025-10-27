# Cloudflare Pages Reconfiguration Guide

## Objective
Change manaxc.com deployment source from `ron746/manaxc-website` to `ron746/manaxc-repo`

---

## Step-by-Step Instructions

### 1. Access Cloudflare Pages Dashboard
1. Go to https://dash.cloudflare.com
2. Log in with your Cloudflare account
3. Click on **"Workers & Pages"** in the left sidebar
4. Find and click on your **manaxc.com** project

### 2. Navigate to Settings
1. Click on the **"Settings"** tab
2. Scroll to **"Build & deployments"** section
3. Look for **"Source"** or **"Connected Git repository"**

### 3. Disconnect Old Repository (if needed)
1. If there's an option to disconnect or change repository, click it
2. You may need to click **"Change source"** or **"Reconnect repository"**

### 4. Connect to New Repository
1. Click **"Connect to Git"** or **"Change repository"**
2. Select **GitHub** as your Git provider
3. Authorize Cloudflare to access your GitHub (if prompted)
4. Select repository: **ron746/manaxc-repo**

### 5. Configure Build Settings

**IMPORTANT:** Use these exact settings:

| Setting | Value |
|---------|-------|
| **Production branch** | `main` |
| **Build command** | `cd manaxc-project/website && npm install && npm run build` |
| **Build output directory** | `manaxc-project/website/out` |
| **Root directory (path)** | `/` (leave as root) |

**Alternative (if Root Directory option exists):**
If Cloudflare allows you to set a "Root directory" or "Base directory":

| Setting | Value |
|---------|-------|
| **Root directory** | `manaxc-project/website` |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `out` |

### 6. Environment Variables (if needed)
If you need to set environment variables:
- Click **"Environment variables"**
- Add any needed variables (though your current setup uses hardcoded values)

### 7. Save and Deploy
1. Click **"Save"** or **"Save and Deploy"**
2. Cloudflare will trigger a new build automatically
3. Watch the deployment progress in the **"Deployments"** tab

---

## Verification Steps

### After Deployment Completes (2-5 minutes):

1. **Check Build Log**
   - Go to **"Deployments"** tab
   - Click on the latest deployment
   - Review the build log for any errors

2. **Visit Website**
   - Go to https://www.manaxc.com
   - Check that the page loads correctly
   - Verify you see your latest changes

3. **Test Functionality**
   - Check navigation links
   - Verify database stats are loading
   - Test responsive design on mobile

---

## Expected Build Output

You should see something like this in the build log:

```
> cd manaxc-project/website && npm install && npm run build

added 350 packages in 15s
> next build
✓ Creating an optimized production build
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages (5/5)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                   137 B      87.1 kB
├ ○ /athletes                           137 B      87.1 kB
├ ○ /courses                            137 B      87.1 kB
└ ○ /schools                            137 B      87.1 kB

Build completed successfully
```

---

## Troubleshooting

### Build Fails with "Command not found"
- **Issue:** Build command path is wrong
- **Fix:** Make sure you included `cd manaxc-project/website &&` in the build command

### Build Fails with "Module not found"
- **Issue:** Dependencies not installed
- **Fix:** Ensure build command includes `npm install`

### Website Shows 404
- **Issue:** Output directory is wrong
- **Fix:** Set output directory to `manaxc-project/website/out`

### Old Website Still Showing
- **Issue:** Browser cache or DNS
- **Fix:**
  - Clear browser cache (Cmd+Shift+R on Mac)
  - Wait 5 minutes for Cloudflare CDN to update
  - Try incognito mode

---

## After Successful Reconfiguration

### Optional: Archive Old Repository
Once the new deployment is working:

1. Go to https://github.com/ron746/manaxc-website
2. Click **"Settings"**
3. Scroll to bottom → **"Archive this repository"**
4. This preserves it but marks it as read-only

### Update Your Workflow
Going forward, all website changes should be:
1. Made in `/Users/ron/manaxc/manaxc-project/website/`
2. Committed to the `manaxc-repo` repository
3. Pushed to GitHub
4. Cloudflare will auto-deploy within 2-5 minutes

---

## Quick Reference

**Cloudflare Dashboard:** https://dash.cloudflare.com
**GitHub Repo:** https://github.com/ron746/manaxc-repo
**Live Site:** https://www.manaxc.com
**Local Website Path:** `/Users/ron/manaxc/manaxc-project/website/`

---

**Created:** October 26, 2025
**Status:** Ready to reconfigure
