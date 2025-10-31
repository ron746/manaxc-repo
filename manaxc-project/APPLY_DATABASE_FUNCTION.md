# Apply Database Function for Efficient Season Page

## What This Does
Creates a PostgreSQL function that efficiently loads only the top 12 athletes per school per gender, instead of loading ALL athletes and filtering client-side.

**Performance Impact:**
- **Before**: Loading 50,000+ athletes, filtering to maybe 7,000 needed
- **After**: Loading exactly the 7,000-12,000 athletes needed (12 per school × ~500 schools × 2 genders)

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `/Users/ron/manaxc/manaxc-project/website/supabase/migrations/20251030_add_top_athletes_function.sql`
6. Paste into the SQL editor
7. Click **Run** or press `Cmd+Enter`

### Option 2: Supabase CLI

```bash
cd /Users/ron/manaxc/manaxc-project/website
supabase db push
```

### Option 3: Direct SQL (if you have psql access)

```bash
cd /Users/ron/manaxc/manaxc-project/website
psql <YOUR_DATABASE_URL> < supabase/migrations/20251030_add_top_athletes_function.sql
```

## Verification

After applying, test by visiting http://localhost:3000/season

You should see:
- Page loads with no data initially
- Select "California State Championship"
- Data loads quickly with only top 12 athletes per school
- Branham should now appear correctly with their fast runners

## Fallback

If the function fails to apply, the page will automatically fall back to the old method (but slower). You'll see a warning in the browser console:
```
Database function not found, using fallback method
```
