import re
import pandas as pd
from datetime import datetime

# Load the raw text file
with open("UNK-Crystal_Springs_Invitational.csv", "r", encoding="utf-8") as f:
    text = f.read()

# Extract meet metadata
meet_name = "Crystal Springs Invitational"
course_name_match = re.search(r"Crystal Springs, CA US", text)
course_name = "Crystal Springs" if course_name_match else "UNK"
date_match = re.search(r"Sat, Oct 11, 2025", text)
meet_date = datetime.strptime("Sat, Oct 11, 2025", "%a, %b %d, %Y")
meet_date_fmt = meet_date.strftime("%Y-%m-%d")
season = meet_date.year if meet_date.month >= 7 else meet_date.year - 1
meet_type = "Invitational"

# Prepare regex to extract race divisions and results
division_pattern = re.compile(r"(\d+\.\d+ Miles.*?)\s+Official Team Scores", re.IGNORECASE)
result_pattern = re.compile(
    r"(\d+)\.\s+(\d{1,2})\s+([A-Za-z\-\'\(\) ]+?)\s+(\d{1,2}:\d{2}\.\d+)\s+([A-Za-z&\-\'\(\) ]+)\s*"
)

# Split text into divisions
divisions = division_pattern.findall(text)

# Extract all results
results = []
for division in divisions:
    division_name = division
    # Estimate gender from division name
    gender = "F" if "Women" in division_name or "Girls" in division_name else "M"
    # Estimate distance in meters
    miles_match = re.search(r"(\d+\.\d+)", division_name)
    distance_meters = round(float(miles_match.group(1)) * 1609.34) if miles_match else 0
    # Extract results within this division
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
        # Format time (preserve all decimals)
        try:
            mm, ss = time_raw.split(":")
            time = f"{int(mm):02}:{ss}"
        except:
            continue
        # Graduation year
        try:
            grade_int = int(grade)
            graduation_year = meet_date.year + (12 - grade_int) if meet_date.month >= 7 else meet_date.year + 1 + (12 - grade_int)
        except:
            graduation_year = "UNK"
        # Split name
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
            "race_category": division_name,
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

# Convert to DataFrame and save
final_df = pd.DataFrame(results)
output_file = f"{meet_date.strftime('%Y-%m%d')}-{meet_name.replace(' ', '_')}.csv"
final_df.to_csv(output_file, index=False)
print(f"CSV file '{output_file}' has been created with {len(final_df)} individual results.")
