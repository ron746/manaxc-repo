import os
import re
import shutil
import pandas as pd
from datetime import datetime

# Create necessary directories
os.makedirs("Pending", exist_ok=True)
os.makedirs("Processed", exist_ok=True)
os.makedirs("To Be Uploaded", exist_ok=True)

def extract_meet_metadata(text):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    meet_name = "UNK"
    course_name = "UNK"
    meet_type = "UNK"
    meet_date_fmt = "UNK"
    meet_date = None
    date_pattern = re.compile(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2},\s*\d{4}")
    course_pattern = re.compile(r",\s*CA\s*US")
    type_keywords = ["invitational", "league", "championship"]
    for line in lines[:50]:
        if meet_name == "UNK" and not date_pattern.search(line) and not course_pattern.search(line) and "Official" not in line:
            meet_name = line
        if course_name == "UNK" and course_pattern.search(line):
            course_name = line.split(",")[0].strip()
        if meet_type == "UNK" and any(kw in line.lower() for kw in type_keywords):
            meet_type = next((kw.capitalize() for kw in type_keywords if kw in line.lower()), "UNK")
        if meet_date_fmt == "UNK":
            match = date_pattern.search(line)
            if match:
                try:
                    meet_date = datetime.strptime(match.group(), "%a, %b %d, %Y")
                    meet_date_fmt = meet_date.strftime("%Y-%m-%d")
                except:
                    continue
    season = meet_date.year if meet_date and meet_date.month >= 7 else (meet_date.year - 1 if meet_date else "UNK")
    return meet_name, course_name, meet_type, meet_date_fmt, meet_date, season

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    meet_name, course_name, meet_type, meet_date_fmt, meet_date, season = extract_meet_metadata(text)

    division_pattern = re.compile(r"(\d+\.\d+ Miles.*?)[\r\n]+Official Team Scores", re.IGNORECASE)
    result_pattern = re.compile(r"(\d+)\.\s+(\d{1,2})\s+([A-Za-z\-\(\)' ]+?)\s+(\d{1,2}:\d{2}\.\d+)\s+([A-Za-z&\-\(\)' ]+)\s*")

    divisions = division_pattern.findall(text)
    results = []

    for division_name in divisions:
        gender = "F" if "Women" in division_name or "Girls" in division_name else "M"
        miles_match = re.search(r"(\d+\.\d+)", division_name)
        distance_meters = round(float(miles_match.group(1)) * 1609.34) if miles_match else 0

        division_start = text.find(division_name)
        next_division_start = len(text)
        for next_div in divisions:
            if next_div != division_name and text.find(next_div) > division_start:
                next_division_start = min(next_division_start, text.find(next_div))
        division_text = text[division_start:next_division_start]

        for match in result_pattern.finditer(division_text):
            place = int(match.group(1))
            grade = match.group(2)
            name = match.group(3).strip()
            time_raw = match.group(4)
            school_name = match.group(5).strip()

            try:
                mm, ss = time_raw.split(":")
                ss_parts = ss.split(".")
                seconds = int(ss_parts[0])
                hundredths = ss_parts[1][:2] if len(ss_parts) > 1 else "00"
                time = f"{int(mm):02}:{seconds:02}.{hundredths}"
            except:
                time = time_raw

            try:
                grade_int = int(grade)
                grad_season = season if season != "UNK" else (meet_date.year if meet_date else None)
                graduation_year = grad_season + (12 - grade_int) + 1 if grad_season else "UNK"
            except:
                graduation_year = "UNK"

            name_clean = re.sub(r"\([^)]*\)", "", name).strip()
            name_parts = name_clean.split()
            athlete_first_name = name_parts[0]
            athlete_last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

            results.append({
                "place": place,
                "grade": grade,
                "time": time,
                "school_name": school_name,
                "race_category": division_name,
                "meet_date": meet_date_fmt,
                "graduation_year": graduation_year,
                "meet_name": meet_name,
                "meet_type": meet_type,
                "course_name": course_name.replace('\"', ''),
                "distance_meters": distance_meters,
                "season": season,
                "gender": gender,
                "athlete_first_name": athlete_first_name,
                "athlete_last_name": athlete_last_name
            })

    final_df = pd.DataFrame(results)
    date_part = meet_date.strftime('%Y-%m%d') if meet_date else "UNK"
    name_part = re.sub(r"[^a-zA-Z0-9 ]", "", meet_name).strip().replace(" ", "_") if meet_name != "UNK" else "UNK"
    output_file = os.path.join("To Be Uploaded", f"{date_part}-{name_part}.csv")
    final_df.to_csv(output_file, index=False)
    print(f"Processed '{os.path.basename(filepath)}' → '{output_file}' with {len(final_df)} results.")

    shutil.move(filepath, os.path.join("Processed", os.path.basename(filepath)))

for filename in os.listdir("Pending"):
    if re.match(r"^\d.*\.csv$", filename):
        process_file(os.path.join("Pending", filename))