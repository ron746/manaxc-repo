# AI Course Difficulty Analysis Setup

## Overview

This system uses true AI (Claude and Gemini) to provide deep analysis of course difficulty ratings, considering:
- Individual athlete performance patterns across multiple courses
- Athlete progression and improvement trends throughout the season
- Systematic biases in course difficulty ratings
- Outlier detection with explanations (improvement, conditions, etc.)
- Statistical confidence based on data quality

## Prerequisites

### 1. API Keys Required

Add these to your `.env.local` file:

```bash
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Google Gemini API
GOOGLE_AI_API_KEY=xxxxx
```

### 2. Get API Keys

**Anthropic Claude:**
1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Copy and add to `.env.local`

**Google Gemini:**
1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API key in new project" or select an existing project
4. Copy the API key (starts with `AIzaSy`)
5. **IMPORTANT**: Make sure the API key has access to "Gemini API" in the API restrictions
6. Add to `.env.local` as `GOOGLE_AI_API_KEY=your-key-here`

**Troubleshooting API Key Issues:**
- If you get "model not found" errors, your API key might need to be configured for the Gemini API
- Go to https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
- Make sure "Generative Language API" is enabled for your project
- Your API key needs to have permissions for this API

## How It Works

### 1. Statistical Analysis (Fast)
The "Refresh Analysis" button runs a **statistical analysis** across all courses:
- Calculates implied difficulty from performance data
- Compares to similar courses
- Provides recommendations based on statistical models

### 2. AI Deep Analysis (Slow, Per-Course)
The **"AI (Claude)" and "AI (Gemini)"** buttons run deep AI analysis on a specific course:
- Analyzes individual athlete performance patterns
- Cross-references each athlete's results on other courses
- Considers career progression and improvement trends
- Identifies systematic biases and outliers
- Provides evidence-based recommendations with detailed reasoning

## Usage

### Running Analysis

1. **Navigate to Course Analysis**
   - Go to `/admin`
   - Click "Course Analysis"

2. **View Statistical Analysis**
   - Automatically loads on page load
   - Shows all courses with basic recommendations
   - Use filters: "All", "Recommendations", "High Confidence"

3. **Run AI Analysis on a Specific Course**
   - Find the course you want to analyze
   - Click **"AI (Claude)"** or **"AI (Gemini)"**
   - Wait ~10-30 seconds for analysis
   - AI results appear in a purple box below the course

### Understanding AI Results

The AI analysis provides:

```json
{
  "recommended_difficulty": 1.123456789,
  "confidence": "high" | "medium" | "low",
  "reasoning": [
    "Athletes consistently run 20s faster here than expected",
    "Duncan Lorang: 4:03 normalized vs 4:35 average on other courses",
    "Course appears easier than difficulty 1.225 suggests"
  ],
  "key_findings": {
    "systematic_bias": "Course rated too difficult",
    "outliers": ["Athlete X improved significantly mid-season"],
    "data_quality": "High - 150+ results with consistent patterns"
  },
  "impact_summary": "Reducing difficulty would improve normalized times for 150 athletes"
}
```

## AI Analysis Features

### What the AI Considers

1. **Individual Athlete Analysis**
   - Compares each athlete's performance on this course vs all their other courses
   - Detects if normalized times are consistently off

2. **Progression Tracking**
   - Considers early season vs late season performances
   - Accounts for athlete improvement over time

3. **Outlier Explanation**
   - Identifies unusual performances
   - Explains why (injury recovery, breakthrough race, etc.)

4. **Statistical Confidence**
   - More data = higher confidence
   - Consistent patterns = higher confidence
   - Agreement with similar courses = higher confidence

### Example: Duncan Lorang Case

**Problem Detected:**
- North Monterey County 3 Miles: 4:03 normalized mile
- All other courses: 4:29-4:51 normalized mile
- 30-second discrepancy is significant

**AI Conclusion:**
Course difficulty rating is too high (1.225), should be closer to 1.0-1.1

## Comparing Claude vs Gemini

Both models will analyze the same data but may provide different insights:

**Claude 3.5 Sonnet:**
- Excellent at detailed reasoning
- Strong pattern recognition
- Good at explaining "why"

**Gemini 1.5 Pro:**
- Large context window (handles more data)
- Fast processing
- Different perspective on same data

**Recommendation:** Run both and compare results. Over time you'll see which provides better insights for cross country analysis.

## Cost Estimates

**Claude 3.5 Sonnet:**
- ~$0.01-0.05 per course analysis
- Input: ~2,000 tokens, Output: ~1,000 tokens

**Gemini 1.5 Pro:**
- ~$0.005-0.025 per course analysis
- Generally cheaper than Claude

**Budget:** ~$5-10 to analyze all courses with both providers

## Troubleshooting

### API Key Errors

```
Error: ANTHROPIC_API_KEY is not set
```

**Solution:** Add API key to `/website/.env.local`

### Analysis Timeout

If analysis takes >60 seconds:
- Reduce `limit(100)` in API route to `limit(50)`
- This analyzes fewer athletes but runs faster

### JSON Parse Errors

Sometimes the AI returns text instead of JSON:
- The system will display the raw text in reasoning
- This is handled gracefully
- Try the other provider if one fails

## Next Steps

1. Set up API keys
2. Run statistical analysis on all courses
3. Pick a suspicious course (like North Monterey County)
4. Run both AI analyses
5. Compare results
6. Document which AI provides better insights

## Future Enhancements

Potential improvements:
- Batch AI analysis (analyze multiple courses at once)
- Historical tracking (see how recommendations change over time)
- Automatic application of high-confidence recommendations
- A/B testing: Apply AI recommendations and measure impact
