#!/usr/bin/env python3
"""
Generate Varsity Team Evaluation Report
- Adjusted times for all courses
- Year-over-year improvement
- Team rankings
"""
from supabase import create_client, Client
from collections import defaultdict

# Supabase configuration
SUPABASE_URL = "https://mdspteohgwkpttlmdayn.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3B0ZW9oZ3drcHR0bG1kYXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMjE0MDQsImV4cCI6MjA3NjY5NzQwNH0.4MT_nDkJg3gtyKgbVwNY1JVgY9Kod4ixRH-r8X7BBqE"

def format_time_cs(cs):
    """Format centiseconds to MM:SS.ss"""
    if not cs:
        return "N/A"
    total_seconds = cs / 100
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    return f"{minutes}:{seconds:05.2f}"

def calculate_adjusted_time(time_cs, course_difficulty):
    """
    Adjust time to standard course (difficulty = 1.0)
    Formula: adjusted_time = actual_time / difficulty
    """
    if not time_cs or not course_difficulty or course_difficulty == 0:
        return time_cs
    return int(time_cs / course_difficulty)

def generate_report():
    """Generate complete varsity evaluation report"""

    print("=" * 120)
    print("WESTMONT HIGH SCHOOL - VARSITY TEAM EVALUATION REPORT")
    print("=" * 120)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get all results with athlete, meet, course data
    print("\nFetching results...")

    query = """
        SELECT
            results.id,
            results.time_cs,
            athletes.name as athlete_name,
            athletes.grad_year,
            meets.meet_date,
            meets.season_year,
            courses.name as course_name,
            courses.distance_meters,
            courses.difficulty_rating
        FROM results
        JOIN athletes ON results.athlete_id = athletes.id
        JOIN meets ON results.meet_id = meets.id
        JOIN courses ON meets.course_id = courses.id
        WHERE meets.season_year IN (2024, 2025)
        ORDER BY meets.meet_date DESC, athletes.name
    """

    results = supabase.rpc('execute_sql', {'query': query}).execute()

    if not results.data:
        print("No results found for 2024-2025 seasons")
        return

    print(f"Found {len(results.data)} results")

    # Organize by athlete
    athletes_data = defaultdict(lambda: {'2024': [], '2025': []})

    for row in results.data:
        athlete_name = row['athlete_name']
        season = str(row['season_year'])

        adjusted_time = calculate_adjusted_time(
            row['time_cs'],
            row['difficulty_rating']
        )

        athletes_data[athlete_name][season].append({
            'date': row['meet_date'],
            'course': row['course_name'],
            'time_cs': row['time_cs'],
            'adjusted_time_cs': adjusted_time,
            'difficulty': row['difficulty_rating'],
            'grad_year': row['grad_year']
        })

    # Calculate best times and improvement
    report_data = []

    for athlete_name, seasons in athletes_data.items():
        best_2024 = min([r['adjusted_time_cs'] for r in seasons['2024']]) if seasons['2024'] else None
        best_2025 = min([r['adjusted_time_cs'] for r in seasons['2025']]) if seasons['2025'] else None

        improvement_cs = None
        improvement_pct = None

        if best_2024 and best_2025:
            improvement_cs = best_2024 - best_2025  # Positive = got faster
            improvement_pct = (improvement_cs / best_2024) * 100

        grad_year = seasons['2025'][0]['grad_year'] if seasons['2025'] else (seasons['2024'][0]['grad_year'] if seasons['2024'] else None)

        report_data.append({
            'name': athlete_name,
            'grad_year': grad_year,
            'best_2024': best_2024,
            'best_2025': best_2025,
            'improvement_cs': improvement_cs,
            'improvement_pct': improvement_pct,
            'races_2024': len(seasons['2024']),
            'races_2025': len(seasons['2025'])
        })

    # Sort by 2025 performance (fastest first)
    report_data.sort(key=lambda x: x['best_2025'] if x['best_2025'] else 999999)

    # Print report
    print("\n" + "=" * 120)
    print("2025 VARSITY RANKINGS (Adjusted Times)")
    print("=" * 120)
    print(f"{'Rank':<6}{'Athlete':<25}{'Class':<8}{'Best 2025':<12}{'Best 2024':<12}{'Improvement':<15}{'%':<8}")
    print("-" * 120)

    for idx, athlete in enumerate(report_data[:20], 1):  # Top 20
        if not athlete['best_2025']:
            continue

        improvement_str = ""
        pct_str = ""

        if athlete['improvement_cs'] is not None:
            if athlete['improvement_cs'] > 0:
                improvement_str = f"-{format_time_cs(abs(athlete['improvement_cs']))}"
                pct_str = f"{athlete['improvement_pct']:.1f}%"
            else:
                improvement_str = f"+{format_time_cs(abs(athlete['improvement_cs']))}"
                pct_str = f"{athlete['improvement_pct']:.1f}%"

        print(f"{idx:<6}{athlete['name']:<25}{athlete['grad_year']:<8}{format_time_cs(athlete['best_2025']):<12}"
              f"{format_time_cs(athlete['best_2024']) if athlete['best_2024'] else 'N/A':<12}{improvement_str:<15}{pct_str:<8}")

    print("\n" + "=" * 120)
    print("MOST IMPROVED ATHLETES (2024 → 2025)")
    print("=" * 120)

    # Sort by improvement
    improved = [a for a in report_data if a['improvement_cs'] and a['improvement_cs'] > 0]
    improved.sort(key=lambda x: x['improvement_cs'], reverse=True)

    print(f"{'Athlete':<25}{'Class':<8}{'2024 Best':<12}{'2025 Best':<12}{'Improved By':<15}{'%':<8}")
    print("-" * 120)

    for athlete in improved[:10]:  # Top 10 most improved
        print(f"{athlete['name']:<25}{athlete['grad_year']:<8}{format_time_cs(athlete['best_2024']):<12}"
              f"{format_time_cs(athlete['best_2025']):<12}-{format_time_cs(athlete['improvement_cs']):<15}"
              f"{athlete['improvement_pct']:.1f}%")

    print("\n" + "=" * 120)

if __name__ == '__main__':
    generate_report()
