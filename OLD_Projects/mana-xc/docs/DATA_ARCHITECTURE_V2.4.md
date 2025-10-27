# DATA ARCHITECTURE V2.4 - SCALABLE & FLEXIBLE SCHEMA (FINAL)

## ⚠️ NON-NEGOTIABLE DATA RULE

* **Time Storage:** All race and workout times must be stored in **CENTISECONDS** (e.g., 15:30.00 = 93000).
* **Field Name:** `time_cs` (used in the `results` table).

---

## 🏛️ CORE POSTGRESQL TABLES (v2.4 Finalized Schema)

* **Status:** Schema creation is complete, including all necessary Foreign Keys, `ath_net_id` fields, and the `CIF_LEVEL_TYPE` enum.

### Key Tables Summary:

| Table Name | Primary Key | Critical Foreign Keys | Critical Data Fields |
| :--- | :--- | :--- | :--- |
| **competitive\_levels** | `id` | `parent_level_id` | `level_type` (ENUM), `name` |
| **schools** | `id` | `cif_level_id` | `ath_net_id` (UNIQUE), `cif_division` |
| **athletes** | `id` | `current_school_id`, `user_id` | `ath_net_id` (UNIQUE), `gender` (BOOLEAN) |
| **meets** | `id` | **(None)** | `ath_net_id` (UNIQUE), **`host_school_id` (NULLable)** |
| **courses** | `id` | **(None)** | `name`, `city` |
| **races** | `id` | `meet_id`, `course_id` | **`xc\_time\_rating` (NUMERIC)**, **`distance\_meters` (INT NOT NULL)** |
| **results** | `id` | `athlete\_id`, `race\_id` | **`time\_cs` (INT NOT NULL)**, `season\_year` (Denormalized) |
| **admin\_log** | `id` | `admin\_user\_id` | `action`, `details` (JSONB) |

### NEW TABLE: Maturation and Prediction Factors

| Table Name | Purpose | Critical Data Fields | Rationale |
| :--- | :--- | :--- | :--- |
| **course\_rating\_defaults** | Provides the necessary statistical starting point for a race's difficulty, ensuring the **Import Tool (Feature 6)** can auto-populate the `xc\_time\_rating`. | `course\_id`, `distance\_meters`, `initial\_xc\_rating` | Guarantees data consistency by removing the initial rating estimation burden from the admin user. |
| **maturation\_curves** | Stores statistical data (e.g., average percentage change) to adjust predictions based on **gender and grade-level progression/regression** (e.g., female junior year regression). | `gender`, `grade\_level`, **`avg\_improvement\_factor`** | Integrates biological realism into the $\text{Race Time Predictor}$ (Feature 1). |

### Materialized View (Performance Cornerstone)

The materialized view calculates the final, normalized XC PR using the rating factor from the **`races`** table.

```sql
CREATE MATERIALIZED VIEW athlete_xc_times_v3 AS
SELECT 
  r.athlete_id,
  -- Uses the rating factor from the races table (ra)
  MIN(r.time_cs * ra.xc_time_rating) as best_xc_time_cs
FROM results r
JOIN races ra ON ra.id = r.race_id
WHERE r.time_cs > 0
GROUP BY r.athlete_id;

-- Refresh command:
REFRESH MATERIALIZED VIEW athlete_xc_times_v3;