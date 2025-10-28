# Cloudflare Build Settings - Correct Values

## ❌ What You Currently Have (INCORRECT):

**Build command:**
```
cd manaxc-project/website && npm install && npm run buildnpm run build
```
⚠️ Problem: "buildnpm" is missing a space - should be "build" only (no duplicate)

**Build output:**
```
outmanaxc-project/website/out
```
⚠️ Problem: "outmanaxc" is concatenated - should be ONLY "manaxc-project/website/out"

---

## ✅ What They Should Be (CORRECT):

**Build command:**
```
cd manaxc-project/website && npm install && npm run build
```
(Notice: ONE "npm run build" at the end, with proper spacing)

**Build output directory:**
```
manaxc-project/website/out
```
(Notice: NO "out" prefix, just the path to the out folder)

**Root directory:**
```
(leave empty or just "/")
```

**Build comments:**
```
Enabled (this is fine)
```

---

## How to Fix:

1. In Cloudflare Settings, click the **edit/pencil icon** next to "Build configuration"
2. **Clear both fields completely**
3. Copy and paste these EXACT values:

### Build command (copy this exactly):
```
cd manaxc-project/website && npm install && npm run build
```

### Build output directory (copy this exactly):
```
manaxc-project/website/out
```

4. Click **Save**

---

## After Fixing:

Once saved correctly, Cloudflare should automatically trigger a new deployment!
