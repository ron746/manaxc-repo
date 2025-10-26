# Service Registry

**CRITICAL:** This file tracks ALL services, accounts, and credentials for Mana XC. Update religiously.

**Last Updated:** October 22, 2025

---

## Domain & DNS

### manaxc.com
- **Registrar:** Cloudflare
- **DNS Provider:** Cloudflare
- **Login Email:** ron_ernst@icloud.com
- **Status:** ✅ Active, DNS configured
- **Notes:** Primary domain for web app, connected to Apple account

### manafitness.com
- **Registrar:** Cloudflare
- **DNS Provider:** Cloudflare
- **Login Email:** ron_ernst@icloud.com
- **Status:** ✅ Active, DNS configured
- **Notes:** Legacy domain, may redirect to manaxc.com or use for blog/content, connected to Apple account

---

## Email

### Primary Business Email
- **Email:** ron@manaxc.com
- **Provider:** [Fill in - Google Workspace? Cloudflare Email Routing?]
- **Used For:** GitHub, all service signups
- **Status:** ✅ Active

---

## Code Repository & Version Control

### GitHub
- **Account Email:** ron@manaxc.com
- **Organization/Username:** ron746
- **Primary Repo:** [Will be created: ron746/manaxc-platform]
- **Status:** ✅ Account created, repos pending
- **Notes:** New account specifically for Mana XC

**Repos to Create:**
- `manaxc-platform` - Main monorepo (frontend, backend, mobile)
- `manaxc-scrapers` - Data collection scripts
- `manaxc-docs` - Public documentation

---

## Backend & Database

### Supabase
- **Project Name:** manaxc
- **Login Email:** ron@manaxc.com (connected via GitHub)
- **Project URL:** https://mdspteohgwkpttlmdayn.supabase.co
- **API Keys:** [Stored in .env.local - NEVER commit to Git]
  - Anon Key: eyJhbGci... (starts with this, full key in password manager)
- **Plan:** Free tier (500MB database, 1GB storage, 2GB bandwidth)
- **Status:** ✅ CREATED - Ready for database setup!
- **Notes:** PostgreSQL database, authentication, storage, real-time subscriptions

**Important Settings:**
- Enable Row Level Security (RLS)
- Set up GitHub OAuth for coach login
- Configure email templates for athlete invitations

### Google Cloud Platform
- **Login Email:** ron@manaxc.com
- **Project ID:** global-timer-475423-e1
- **Grant Status:** ⏳ Application pending
- **Credits:** ✅ Initial credits received, waiting on additional grant
- **Status:** ✅ Active account, grant pending
- **Planned Usage:** 
  - Cloud Storage (backup for Supabase)
  - Cloud Functions (if we outgrow Supabase Edge Functions)
  - BigQuery (future analytics)

---

## Frontend Hosting

### Vercel
- **Login Email:** ron@manaxc.com (connected via GitHub)
- **Team:** Personal (connected to ron746 GitHub)
- **Connected Repo:** [Will create: ron746/manaxc-platform]
- **Domains:** manaxc.com, www.manaxc.com
- **Plan:** Free tier (Hobby)
- **Status:** ✅ Account created, ready for repo connection
- **Notes:** Hosts Next.js frontend, automatic deploys from GitHub

**Deployment Targets:**
- Production: manaxc.com (main branch)
- Staging: staging.manaxc.com (develop branch)

---

## Mobile App Distribution

### Apple Developer Program
- **Status:** ⏳ Not yet enrolled
- **Cost:** $99/year
- **Required For:** TestFlight + App Store
- **Priority:** Medium (can test with Expo Go initially)

### Google Play Console
- **Status:** ⏳ Not yet enrolled
- **Cost:** $25 one-time
- **Required For:** Internal testing + Play Store
- **Priority:** Medium (can test with Expo Go initially)

### Expo
- **Login Email:** [TBD - recommend ron@manaxc.com]
- **Account:** [TBD]
- **Status:** ⏳ Needs to be created
- **Notes:** Build service for React Native app

---

## Data Sources (External)

### Athletic.net
- **Type:** Web scraping (no official API)
- **Data:** Westmont HS results 2010-2025 (~15 years)
- **Scraping Status:** ⏳ Not yet implemented
- **Legal:** Review Terms of Service, implement rate limiting
- **Notes:** Primary source for historical meet results

### MileSplit
- **Type:** Web scraping (investigate API availability)
- **Data:** Recent meet results, times, rankings
- **Status:** ⏳ Research needed
- **Notes:** More current data than Athletic.net in some cases

### Lynbrook Sports
- **Type:** PDF parsing
- **Data:** Historical course data, rankings
- **Status:** ⏳ Research needed
- **Notes:** Valuable for course difficulty algorithm

---

## Payment Processing (Future)

### Stripe
- **Status:** ⏳ Not needed for MVP (everything free)
- **Login Email:** ron@manaxc.com (when created)
- **Notes:** Will implement for Phase 2 ($3/month athletes, $50/month teams)

---

## Analytics & Monitoring (Future)

### Google Analytics
- **Status:** ⏳ Implement after MVP launch
- **Tracking ID:** [TBD]

### Sentry (Error Monitoring)
- **Status:** ⏳ Implement after MVP launch
- **Plan:** Free tier

---

## Environment Variables & Secrets

**Location:** `.env.local` files (NOT committed to Git)

**Supabase:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Athletic.net Scraper:**
```
SCRAPER_USER_AGENT=
SCRAPER_RATE_LIMIT=
```

**Future - Stripe:**
```
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Credentials Management

**DO NOT STORE PASSWORDS IN THIS FILE**

Actual passwords/API keys stored in:
- Apple Passwords (iCloud Keychain)
- Local `.env.local` files (gitignored)
- Vercel environment variables (production)

---

## Service Onboarding Checklist

When adding a new service:
- [ ] Record in this file
- [ ] Use ron@manaxc.com for login (consistency)
- [ ] Store credentials in password manager
- [ ] Add to `.env.local` if applicable
- [ ] Document in relevant README
- [ ] Update `progress/decisions.md` with why we chose this service

---

## Contact & Support

**Who to Contact When Things Break:**

- **Domains/DNS:** Cloudflare support (if Cloudflare) or registrar support
- **GitHub:** GitHub Support (support.github.com)
- **Supabase:** Supabase Discord or support@supabase.io
- **Vercel:** Vercel Support (vercel.com/support)
- **Expo:** Expo Forums (forums.expo.dev)

**Primary Contact:** Ron (ron@manaxc.com)

---

**Action Items (Immediate):**
1. Fill in missing domain registrar info
2. Create Supabase project
3. Create Vercel account
4. Set up password manager if not already using one
5. Review this file weekly to keep it current
