// lib/grade-utils.ts
// Grade calculation utilities for Mana XC

/**
 * Calculate current grade from graduation year and season year
 * @param graduationYear - Year the athlete graduates (e.g., 2026)
 * @param seasonYear - XC season year (e.g., 2025)
 * @returns Grade level (9-12)
 */
export function calculateGrade(graduationYear: number, seasonYear: number): number {
  // Grade = 12 - (graduation year - (season year + 1))
  // Example: 2026 graduate in 2025 season = 12 - (2026 - 2026) = 12th grade
  const grade = 12 - (graduationYear - (seasonYear + 1));

  // Ensure grade is within reasonable range
  return Math.max(9, Math.min(12, grade));
}

/**
 * Get grade display string
 * @param graduationYear - Year the athlete graduates
 * @param seasonYear - XC season year
 * @returns Grade as string (e.g., "12", "11")
 */
export function getGradeDisplay(graduationYear: number, seasonYear: number): string {
  if (!graduationYear) return 'N/A';
  const grade = calculateGrade(graduationYear, seasonYear);
  return grade.toString();
}

/**
 * Get grade with suffix for display
 * @param graduationYear - Year the athlete graduates
 * @param seasonYear - XC season year
 * @returns Grade with suffix (e.g., "9th", "10th", "11th", "12th")
 */
export function getGradeWithSuffix(graduationYear: number, seasonYear: number): string {
  if (!graduationYear) return 'N/A';
  const grade = calculateGrade(graduationYear, seasonYear);

  const suffixes: { [key: number]: string } = {
    9: '9th',
    10: '10th',
    11: '11th',
    12: '12th'
  };

  return suffixes[grade] || `${grade}th`;
}
