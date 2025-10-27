
import pandas as pd
from datetime import datetime
import re
import sys
import os


def sanitize_filename(name):
    name = re.sub(r"[^a-zA-Z0-9 ]", "", name)
    return name.strip().replace(" ", "_")


def process_meet_results(filename):
    xls = pd.ExcelFile(filename, engine="openpyxl")
    df = xls.parse(xls.sheet_names[0], header=None)

    # Extract meet name and course name
    meet_name = "UNK"
    course_name = "UNK"
    meet_type = "UNK"
    meet_date_fmt = "UNK"
    meet_date = None

    # Scan first 50 rows for metadata
    date_pattern = re.compile(r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2},\s\d{4}")
    for i in range(min(50, len(df))):
        for cell in df.iloc[i]:
            if pd.isna(cell):
                continue
            text = str(cell).strip()
            if meet_name == "UNK" and not date_pattern.search(text) and not re.search(r",\s*CA\s*US", text) and "Official" not in text:
                meet_name = text
            if course_name == "UNK" and re.search(r",\s*CA\s*US", text):
                course_name = text.split(",")[0].strip()
            if meet_type == "UNK" and any(kw in text.lower() for kw in ["invitational", "league", "championship"]):
                meet_type = next((kw.capitalize() for kw in ["Invitational", "League", "Championship"] if kw.lower() in text.lower()), "UNK")
            if meet_date_fmt == "UNK":
                match = date_pattern.search(text)
                if match:
                    try:
                        meet_date = datetime.strptime(match.group(), "%a, %b %d, %Y")
                        meet_date_fmt = meet_date.strftime("%Y-%m-%d")
                    except:
                        continue

    if meet_date_fmt == "UNK":
        print("Warning: No valid date found in the first 50 rows. Using 'UNK' for meet_date.")

    season = meet_date.year if meet_date and meet_date.month >= 7 else meet_date.year - 1 if meet_date else "UNK"

    results = []
    gender = "UNK"
    race_category = ""
    distance_meters = 0

    for i in range(len(df)):
        row = df.iloc[i]
        if pd.isna(row[0]):
            continue
        text = str(row[0]).strip().lower()

        if "boys" in text:
            gender = "M"
        elif "girls" in text:
            gender = "F"
        elif "mens results" in text:
            gender = "M"
        elif "womens results" in text:
            gender = "F"

        if "miles" in text:
            race_category = str(row[0]).strip()
            miles_match = re.search(r"([\d\.]+)\s+miles", race_category, re.IGNORECASE)
            if miles_match:
                distance_miles = float(miles_match.group(1))
                distance_meters = round(distance_miles * 1609.34)

        if re.match(r"^\d+$", str(row[0]).strip()):
            place = int(row[0])
            grade = row[1] if pd.notna(row[1]) else "UNK"
            name = str(row[2]).strip()
            time_raw = row[4]
            school_name = row[6] if pd.notna(row[6]) else "UNK"

            if pd.isna(time_raw):
                continue

            try:
                time_parts = str(time_raw).split(":")
                if len(time_parts) == 3:
                    mm = int(time_parts[1])
                    ss = float(time_parts[2])
                else:
                    mm = int(time_parts[0])
                    ss = float(time_parts[1])
                time = f"{mm:02}:{ss:05.2f}"
            except:
                continue

            try:
                grade_int = int(grade)
                if meet_date:
                    if meet_date.month >= 7:
                        graduation_year = meet_date.year + (12 - grade_int)
                    else:
                        graduation_year = meet_date.year + 1 + (12 - grade_int)
                else:
                    graduation_year = "UNK"
            except:
                graduation_year = "UNK"

            name_parts = name.split()
            name_parts = [part.capitalize() for part in name_parts]
            if len(name_parts) == 1:
                athlete_first_name = name_parts[0]
                athlete_last_name = "UNK"
            else:
                athlete_first_name = " ".join(name_parts[:-1])
                athlete_last_name = name_parts[-1]

            results.append({
                "place": place,
                "grade": grade,
                "time": time,
                "school_name": school_name,
                "race_category": race_category,
                "meet_date": meet_date_fmt,
                "graduation_year": graduation_year,
                "meet_name": meet_name,
                "meet_type": meet_type,
                "course_name": course_name,
                "distance_meters": distance_meters,
                "season": season,
                "gender": gender,
                "athlete_first_name": athlete_first_name,
                "athlete_last_name": athlete_last_name
            })

    final_df = pd.DataFrame(results)
    date_part = meet_date.strftime("%Y-%m%d") if meet_date else "UNK"
    name_part = sanitize_filename(meet_name) if meet_name != "UNK" else "UNK"
    output_file = f"{date_part}-{name_part}.csv"
    final_df.to_csv(output_file, index=False)
    print(f"CSV file '{output_file}' has been created.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python process_meet_v4.py <input_file.xlsx>")
    else:
        process_meet_results(sys.argv[1])
