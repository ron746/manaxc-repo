# MANA XC MASTER STRATEGY & ROADMAP

## 🎯 MISSION AND VISION

* **Vision:** Become the definitive XC statistics tool, providing superior analytics, UX, and AI-powered insights to the dedicated high school runner.
* **Target Audience:** High School Distance Runners and their Coaches.
* **The Market Gap:** The fundamental disconnect between training data (Strava/Runna) and official race results (Athletic.net/xcStats).

---

## 🧭 PROJECT TIMELINE PROJECTION (18-Month Plan)

| Phase | Duration | Core Goal | Initial Free Hook | Premium Monetization |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0: Foundation** (Current) | ~1 Month | **Build the Data Moat & Cleanliness Tools.** Set up the scalable architecture. Implement Admin Tools (Import, Merge, Delete). | Initial access to the comprehensive race results database. | None |
| **Phase 1: The Ecosystem** | Months 7-12 | **Connect & Personalize.** Integrate Wearable APIs (Garmin, Strava). Launch the first tier of AI-driven analysis. | Full Results Database + Workout Logging. | **Tier 1 (AI Insights):** Intelligent feedback on completed workouts. |
| **Phase 2: The Engine** | Months 13-18 | **Scale & Monetize.** Launch fully personalized, adaptive AI training plans. Expand data coverage. | Full Results Database + Workout Logging. | **Tier 2 (AI Training Plans):** Premium, personalized, adaptive training plans. |

---

## 📈 COMPETITIVE & SCALING INSIGHTS

* **Competitive Edge:** The platform is positioned to answer the question: "How is the specific training I am doing impacting my official race outcomes?".
* **Monetization Strategy:** Freemium model targeting the athlete, with a free data/results tier, and two paid tiers for AI features.
* **Key Data Source Targets:** Lynbrook Sports (Historical, Public), Athletic.net (for `ath_net_id` linking/verification).
* **Course Rating Innovation:** Internal difficulty factor is the **1-Mile Track Equivalent**. This is stored in the **`races.xc_time_rating`** field, as difficulty is dependent on the specific course + distance run.