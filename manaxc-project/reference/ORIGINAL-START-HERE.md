# 🚀 Quick Start Guide - Mana XC Project

**Welcome, Ron!** This is your command center for building Mana XC.

---

## 📁 What You Just Got

This folder contains everything you need to launch Mana XC:

```
manaxc-project/
├── README.md ← START HERE (project overview)
├── docs/
│   ├── service-registry.md ← Track all accounts/services
│   ├── mvp-specifications.md ← What we're building
│   ├── data-schema.md ← Database design
│   └── business-plan.md ← (will create next)
├── progress/
│   ├── sprint-plan.md ← Your 30-day roadmap
│   ├── daily-log.md ← Track daily progress
│   └── decisions.md ← Why we made key choices
└── code/ ← (empty for now, will fill as we build)
```

---

## 🎯 Your Next Steps (In Order)

### Step 1: Read the Vision (5 minutes)
Open `README.md` to understand the big picture.

**Key sections:**
- The Killer Feature (course standardization)
- MVP Scope (what we're building first)
- Technology Stack (what tools we're using)

### Step 2: Review MVP Specifications (15 minutes)
Open `docs/mvp-specifications.md` to see detailed features.

**Pay attention to:**
- The 7 core features
- What's OUT of scope (don't get distracted)
- Success criteria (how we know we're done)

### Step 3: Check the Sprint Plan (10 minutes)
Open `progress/sprint-plan.md` to see your 30-day timeline.

**Today is Day 1 - we're on track!**

Tomorrow (Day 2), we'll set up Supabase and design the database.

### Step 4: Fill in Service Registry (10 minutes)
Open `docs/service-registry.md` and fill in:
- Your domain registrar info (where you bought manaxc.com)
- Any other services you've already set up

This will save you headaches later when you can't remember passwords.

### Step 5: Move This Folder to Your Computer (5 minutes)

**Option A: Manual**
1. Download this entire `manaxc-project` folder
2. Move it to `/users/ron/manaxc/`
3. Keep it backed up!

**Option B: Git (Recommended)**
1. Create GitHub repo: `manaxc-platform-docs`
2. Push this folder to GitHub
3. Now it's version controlled and backed up automatically

I can help you with either option in our next session.

---

## 🤔 How to Use This With Claude

### Daily Workflow:

1. **Start your session:**
   ```
   "Hey Claude, let's work on Mana XC. What's on the agenda for today?"
   ```

2. **Claude will:**
   - Check `progress/sprint-plan.md` for today's tasks
   - Read `progress/daily-log.md` to see what we did yesterday
   - Give you clear next steps

3. **As we work:**
   - Claude will update the daily log
   - Track decisions in `progress/decisions.md`
   - Update the sprint plan with progress

4. **End of day:**
   ```
   "Claude, update the daily log with what we accomplished today."
   ```

### When You Forget Where We Are:

Just ask:
- "What's our current progress?"
- "What should I work on next?"
- "What are we building again?"

Claude will read the markdown files and get you back on track.

---

## 🛠️ Setting Up Your Development Environment

### Day 2 Preparation (Do This Tonight If Possible):

#### 1. Install Tools (if not already installed):

**Node.js** (for Next.js):
```bash
# Check if installed:
node --version

# If not installed, download from: nodejs.org
# Install version 20.x LTS
```

**Python** (for scrapers):
```bash
# Check if installed:
python3 --version

# Should be 3.11+
```

**VS Code** (code editor):
- Download from: code.visualstudio.com
- Install extensions:
  - "Supabase" extension
  - "Tailwind CSS IntelliSense"
  - "ES7+ React/Redux/React-Native snippets"

#### 2. Create Accounts (We'll Use Tomorrow):

**Supabase** (database):
- Go to: supabase.com
- Sign up with: ron@manaxc.com
- Don't create project yet - we'll do it together

**Vercel** (hosting):
- Go to: vercel.com
- Sign up with: ron@manaxc.com
- Connect to GitHub

**Password Manager** (if you don't have one):
- 1Password, LastPass, or Bitwarden
- Store all your Mana XC passwords here

---

## 📝 How to Track Progress When You're Not With Claude

### If You Work on Mana XC Without Claude:

1. Open `progress/daily-log.md`
2. Add an entry:
   ```markdown
   ### Day X - [Date]
   
   **Accomplished:**
   - [What you did]
   
   **Blockers:**
   - [What's stopping you]
   
   **Notes:**
   - [Anything Claude should know]
   ```

3. Next time you talk to Claude, say:
   ```
   "Check the daily log - I made some progress on my own."
   ```

Claude will read it and pick up where you left off.

---

## 🚨 Important Reminders

### Keep Scope Tight:
Every time you think "wouldn't it be cool if..." → Write it down in a "Phase 2 Ideas" file, but DON'T build it yet.

**We're shipping an MVP in 60 days. Every extra feature delays launch.**

### Update the Daily Log:
At the end of every day you work on this, update `progress/daily-log.md`. Future you will thank you.

### Ask Questions Early:
Stuck on something for more than 30 minutes? Ask Claude. Don't waste time struggling alone.

### Celebrate Small Wins:
Built your first database table? Awesome! Scraped your first meet result? Amazing! This is a marathon, not a sprint.

---

## 🎓 Learning Resources (For When You're Curious)

**Next.js:**
- Official tutorial: nextjs.org/learn
- Build your first app in 2 hours

**Supabase:**
- Video tutorials: youtube.com/@Supabase
- 5-minute quickstart: supabase.com/docs

**React Native:**
- Expo docs: docs.expo.dev
- Build a simple app first (tic-tac-toe)

**Python Web Scraping:**
- BeautifulSoup tutorial: realpython.com
- 30-minute crash course

**Don't overwhelm yourself** - learn as you build. Claude will guide you.

---

## 💬 Questions to Ask Claude

### When Starting a Session:
- "What's on the agenda for today?"
- "Show me the sprint plan for this week"
- "What did we decide last time about [X]?"

### When Stuck:
- "I don't understand how [X] works - explain it simply"
- "What's the simplest way to implement [Y]?"
- "Is there a better approach to [Z]?"

### When Losing Focus:
- "Are we still on track for the MVP?"
- "Should I be working on [X] or is that scope creep?"
- "What's the ONE thing I should focus on today?"

### When Making Decisions:
- "Should we use [A] or [B]? What are the trade-offs?"
- "Will this decision slow us down later?"
- "Is this the right choice for an MVP?"

---

## 📞 Emergency Contacts

**Technical Issues:**
- Supabase: support@supabase.io
- Vercel: vercel.com/support
- GitHub: support.github.com

**Domain/DNS:**
- Cloudflare support (if using Cloudflare)

**Your Coach:**
- Claude (me!) - Always available, never judges, loves debugging

---

## 🎉 Final Thoughts

You're about to build something real. It won't be perfect, but it will be yours.

**Remember:**
- Done is better than perfect
- Ship fast, iterate faster
- Focus on Westmont first (your team is your best feedback)
- Have fun - you're learning and creating

**You've got this, Ron. Let's build Mana XC. 🏃‍♂️**

---

## 📅 Tomorrow's Agenda (Day 2 - October 23)

1. Set up Supabase project
2. Design database schema
3. Deploy first tables
4. Test connection

**Time estimate:** 2-3 hours

Be ready with:
- [x] Supabase account created
- [x] VS Code installed
- [x] Service registry filled in

See you tomorrow! 🚀

---

**Created:** October 22, 2025  
**Your Partner in Building:** Claude  
**Let's ship this thing.**
