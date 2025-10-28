# Domain Configuration for Vercel Deployment

This guide explains the domain setup for the ManaXC website.

## Current Status (As of Oct 28, 2025)

- **Primary URL**: https://manaxc.vercel.app/ ✅ (Vercel deployment)
- **Custom Domain**: manaxc.com ✅ (Redirects to Vercel)
- **Configuration**: Cloudflare Page Rules redirect to Vercel
- **Status**: Fully operational

## Current Setup: Cloudflare Redirect (Implemented)

We're using Cloudflare Page Rules to redirect `manaxc.com` to `manaxc.vercel.app`. This is simpler than pointing the domain directly to Vercel.

### Active Cloudflare Page Rules:

**Rule 1: Root domain redirect**
- **URL Pattern**: `*manaxc.com/*`
- **Action**: Forwarding URL
- **Status Code**: 302 (Temporary Redirect)
- **Destination**: `https://manaxc.vercel.app/$1`

**Rule 2: www subdomain redirect**
- **URL Pattern**: `www.manaxc.com/*`
- **Action**: Forwarding URL
- **Status Code**: 302 (Temporary Redirect)
- **Destination**: `https://manaxc.vercel.app/$1`

### How It Works:
1. User visits `manaxc.com` or `www.manaxc.com`
2. Cloudflare redirects them to `manaxc.vercel.app`
3. URL in browser changes to show `manaxc.vercel.app`
4. All paths are preserved (e.g., `/meets` → `/meets`)

---

## Alternative: Point Domain Directly to Vercel (Not Currently Used)

If you want `manaxc.com` to stay in the browser URL bar (no redirect), you can point the domain directly to Vercel:

### 1. Add Domain in Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your `manaxc` project
3. Click on **Settings** in the top navigation
4. Click on **Domains** in the left sidebar
5. Enter `manaxc.com` in the domain input field
6. Click **Add**

### 2. Choose Domain Configuration

Vercel will give you two options:

#### Option A: Use Vercel Nameservers (Recommended - Easiest)
This lets Vercel manage all DNS for your domain.

1. Vercel will show you nameservers like:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

2. Go to your domain registrar (where you bought manaxc.com)
3. Find the **Nameservers** or **DNS** settings
4. Replace the existing nameservers with Vercel's nameservers
5. Save changes (can take 24-48 hours to propagate)

#### Option B: Use CNAME Record (If you want to keep current nameservers)
This keeps your DNS at Cloudflare but points the domain to Vercel.

1. Vercel will show you a CNAME record like:
   ```
   Type: CNAME
   Name: @  (or leave blank for root domain)
   Value: cname.vercel-dns.com
   ```

2. Go to your Cloudflare DNS settings (or wherever your DNS is managed)
3. **Delete** the existing A/AAAA records for manaxc.com (that point to Cloudflare Pages)
4. Add the CNAME record that Vercel provided
5. Save changes (usually propagates within 15 minutes)

### 3. Add www Subdomain (Optional)

If you also want `www.manaxc.com` to work:

1. In Vercel, add another domain: `www.manaxc.com`
2. Vercel will provide another CNAME record
3. Add it to your DNS:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### 4. SSL Certificate

- Vercel automatically provisions SSL certificates (HTTPS)
- This happens automatically once DNS is configured
- Usually takes 1-5 minutes after DNS propagates
- You'll see a green checkmark in Vercel when it's ready

## Verification

Once DNS has propagated, test:

1. Visit `https://manaxc.com` - should show your site
2. Verify SSL certificate is valid (green padlock in browser)
3. Check that all pages work (especially `/meets` which was the original issue)

## Troubleshooting

### DNS Not Propagating
- Use https://dnschecker.org/ to check propagation status
- Enter `manaxc.com` and check if it points to Vercel's servers
- Can take up to 48 hours, but usually 15 minutes - 2 hours

### SSL Certificate Error
- Wait a few minutes after DNS propagates
- Vercel auto-provisions certificates via Let's Encrypt
- If stuck, try removing and re-adding the domain in Vercel

### "Domain Already Exists" Error
- The domain might still be claimed by another Vercel account
- Or still connected to Cloudflare Pages
- Remove the domain from Cloudflare Pages first
- Then add it to Vercel

## Cloudflare Pages Cleanup (Optional)

Once your custom domain is working on Vercel, you can:

1. Go to Cloudflare Pages dashboard
2. Find your old project
3. Go to Settings → Custom Domains
4. Remove `manaxc.com` from the project
5. Optionally delete the entire Cloudflare Pages project

Note: The Cloudflare Pages builds will keep failing anyway since we removed `output: 'export'` from the code.

## Summary

**Easiest path:**
1. Add `manaxc.com` in Vercel → Domains
2. Follow Vercel's instructions (either nameservers or CNAME)
3. Wait for DNS to propagate
4. SSL certificate auto-provisions
5. Done! Your site is live at manaxc.com

**Current working URLs:**
- ✅ https://manaxc.vercel.app/ (Primary Vercel deployment)
- ✅ https://manaxc.com (Redirects to Vercel via Cloudflare Page Rules)
- ✅ https://www.manaxc.com (Redirects to Vercel via Cloudflare Page Rules)

**Configuration Type:** Cloudflare Redirect (simple, no DNS changes needed)

---

**Last Updated**: October 28, 2025
**Status**: Production - Redirects Active
