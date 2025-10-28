# ManaXC Website

Cross country statistics and records tracking website for high school XC in California.

## Tech Stack

- **Framework**: Next.js 16.0.0 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL via Supabase
- **Deployment**: Vercel
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Environment variables configured

### Development

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
app/
├── page.tsx                    # Home page
├── meets/                      # Meets listing and details
├── courses/                    # Courses listing and details
│   └── [id]/
│       ├── page.tsx           # Course detail page (includes records)
│       ├── records/page.tsx   # Old records page (deprecated)
│       └── performances/      # Individual performances (TODO)
├── schools/                    # Schools listing and details
├── athletes/                   # Athletes listing and details
└── season/                     # Season pages

components/
├── layout/
│   └── Header.tsx             # Navigation header
└── ...

lib/
├── supabase/
│   ├── client.ts              # Supabase client
│   └── queries.ts             # Database queries
└── utils/
    └── time.ts                # Time formatting utilities
```

## Features

### Current Features

- **Meets**: Browse and search meets by year, type, and name
- **Courses**: View course details, records, and team performances
  - Overall course records (fastest time ever)
  - Grade-level records (9th-12th)
  - Top team performances (combined time of top 5 runners)
- **Schools**: Browse schools and view their athletes
- **Athletes**: Search athletes and view their race history
- **Seasons**: View season-specific data

### Course Records

Course detail pages display:
- Overall course record for boys and girls
- Grade-level records (Freshman through Senior)
- Top 5 team performances (based on combined time of top 5 runners in a single race)
- All meets held on the course
- Link to detailed performances page

Team scoring follows standard XC rules:
- Must have exactly 5 runners
- Combined time (sum) of top 5 runners
- Grouped by race (not across multiple races)

## Database Schema

Key tables:
- `courses` - XC courses/venues
- `venues` - Physical locations of meets
- `meets` - Meet records
- `races` - Individual races (linked to courses and meets)
- `results` - Individual athlete results
- `athletes` - Athlete records
- `schools` - School records

## Documentation

- **Sprint Documentation**: See [CLAUDE_PROMPT.md](./CLAUDE_PROMPT.md) for detailed sprint notes
- **Deployment Guide**: See [VERCEL_DOMAIN_SETUP.md](./VERCEL_DOMAIN_SETUP.md) for deployment info

## Development Notes

### Known Issues

1. Data accuracy investigation needed for course records (see CLAUDE_PROMPT.md)
2. Debug logging currently active in production (should be removed)

### Upcoming Features

1. Course performances page (filterable by gender, grade, school, season)
2. Season leaderboards
3. PR tracking
4. Head-to-head comparisons

## Deployment

The site is deployed on Vercel:
- Production: https://manaxc.vercel.app (or custom domain)
- Automatic deployments from `main` branch

See [VERCEL_DOMAIN_SETUP.md](./VERCEL_DOMAIN_SETUP.md) for domain configuration details.

## Contributing

This is a private project. For questions or issues, contact the project maintainer.

## License

Private - All rights reserved

