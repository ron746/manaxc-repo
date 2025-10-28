# How to Find Cloudflare Pages Project

## You're Currently Here:
✗ **Cloudflare Domain Dashboard** (manaxc.com domain settings)
  - This manages DNS, SSL, security for the domain
  - NOT where the website deployment is configured

## You Need to Go Here:
✓ **Cloudflare Pages Project**
  - This is where the actual website/app is deployed
  - This is where you change the GitHub repository

---

## Step-by-Step Navigation

### From Where You Are Now:

1. **Look at the LEFT sidebar** in Cloudflare
2. Find and click on **"Workers & Pages"** (it's in the left menu)
   - It might have a wrench icon or similar
   - Look for it below items like "DNS", "Email", "SSL/TLS"

3. Once you click "Workers & Pages", you'll see a list of your projects
4. Look for a project that's probably named something like:
   - `manaxc-com`
   - `manaxc-website`
   - Or just click on the one that shows manaxc.com as the custom domain

5. **Click on that project** to open it

### What You'll See Next:
- A page showing deployments/builds
- Tabs at the top: "Deployments", "Settings", "Custom domains", etc.
- Click the **"Settings"** tab
- Scroll down to **"Builds & deployments"**
- There you'll see the GitHub repository connection!

---

## Alternative: Direct Link

Try this direct link (if it works):
https://dash.cloudflare.com/pages

This should take you straight to the Pages section.

---

## Visual Clues You're in the Right Place:

You'll know you're in the right place when you see:
- ✓ A "Deployments" tab showing build history
- ✓ GitHub logo/integration mentioned
- ✓ Build settings like "Build command", "Output directory"
- ✓ Recent deployment logs

You'll know you're in the WRONG place (domain settings) when you see:
- ✗ DNS records
- ✗ SSL/TLS settings
- ✗ Security features like Page Shield
- ✗ No mention of builds or deployments
