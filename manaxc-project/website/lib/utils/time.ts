/**
 * Time Utility Functions for ManaXC
 *
 * All times are stored in CENTISECONDS in the database (ADR-001)
 * Example: 19:30.45 = 117045 centiseconds
 */

/**
 * Format centiseconds to MM:SS.CC display format
 * @param time_cs - Time in centiseconds
 * @returns Formatted string like "19:30.45"
 */
export function formatTime(time_cs: number): string {
  if (!time_cs || time_cs <= 0) return '--:--';

  const minutes = Math.floor(time_cs / 6000);
  const seconds = Math.floor((time_cs % 6000) / 100);
  const centiseconds = time_cs % 100;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

/**
 * Format centiseconds to MM:SS display format (without centiseconds)
 * @param time_cs - Time in centiseconds
 * @returns Formatted string like "19:30"
 */
export function formatTimeShort(time_cs: number): string {
  if (!time_cs || time_cs <= 0) return '--:--';

  const minutes = Math.floor(time_cs / 6000);
  const seconds = Math.floor((time_cs % 6000) / 100);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to centiseconds
 * Supports formats: MM:SS or MM:SS.CC
 * @param timeStr - Time string like "19:30" or "19:30.45"
 * @returns Time in centiseconds
 */
export function parseTime(timeStr: string): number {
  if (!timeStr) return 0;

  const [minuteStr, rest] = timeStr.split(':');
  if (!rest) return 0;

  const [secondStr, centiStr = '00'] = rest.split('.');

  const minutes = parseInt(minuteStr) || 0;
  const seconds = parseInt(secondStr) || 0;
  const centis = parseInt(centiStr.padEnd(2, '0').slice(0, 2)) || 0;

  return minutes * 6000 + seconds * 100 + centis;
}

/**
 * Calculate pace per mile in centiseconds
 * @param time_cs - Time in centiseconds
 * @param distance_meters - Distance in meters
 * @returns Pace per mile in centiseconds
 */
export function calculatePace(time_cs: number, distance_meters: number): number {
  if (!distance_meters || distance_meters <= 0) return 0;

  const metersPerMile = 1609.34;
  const pace_cs = (time_cs / distance_meters) * metersPerMile;

  return Math.round(pace_cs);
}

/**
 * Format pace per mile
 * @param time_cs - Time in centiseconds
 * @param distance_meters - Distance in meters
 * @returns Formatted pace like "6:15/mi"
 */
export function formatPace(time_cs: number, distance_meters: number): string {
  const pace_cs = calculatePace(time_cs, distance_meters);
  return formatTimeShort(pace_cs) + '/mi';
}

/**
 * Convert centiseconds to total seconds (decimal)
 * @param time_cs - Time in centiseconds
 * @returns Time in seconds as decimal (19:30.45 = 1170.45)
 */
export function centisecondsToSeconds(time_cs: number): number {
  return time_cs / 100;
}

/**
 * Convert seconds to centiseconds
 * @param seconds - Time in seconds (can be decimal)
 * @returns Time in centiseconds
 */
export function secondsToCentiseconds(seconds: number): number {
  return Math.round(seconds * 100);
}

/**
 * Calculate time difference and format it with +/- sign
 * @param time1_cs - First time in centiseconds
 * @param time2_cs - Second time in centiseconds
 * @returns Formatted difference like "+15.2" or "-8.5"
 */
export function formatTimeDiff(time1_cs: number, time2_cs: number): string {
  const diff_cs = time1_cs - time2_cs;
  const diff_seconds = Math.abs(diff_cs) / 100;
  const sign = diff_cs >= 0 ? '+' : '-';

  return `${sign}${diff_seconds.toFixed(1)}s`;
}

/**
 * Format distance in meters to display format
 * @param meters - Distance in meters
 * @returns Formatted distance like "5K" or "3 mile"
 */
export function formatDistance(meters: number): string {
  if (meters === 5000) return '5K';
  if (meters === 4828) return '3 mile';
  if (meters === 3200) return '2 mile';
  if (meters === 1600) return '1 mile';

  // Convert to kilometers if >= 1000m
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1);
    return `${km}K`;
  }

  return `${meters}m`;
}

/**
 * Calculate average time from array of times
 * @param times_cs - Array of times in centiseconds
 * @returns Average time in centiseconds
 */
export function calculateAverage(times_cs: number[]): number {
  if (!times_cs || times_cs.length === 0) return 0;

  const sum = times_cs.reduce((acc, time) => acc + time, 0);
  return Math.round(sum / times_cs.length);
}

/**
 * Get best (fastest) time from array
 * @param times_cs - Array of times in centiseconds
 * @returns Best time in centiseconds
 */
export function getBestTime(times_cs: number[]): number {
  if (!times_cs || times_cs.length === 0) return 0;
  return Math.min(...times_cs);
}

/**
 * Calculate improvement percentage
 * @param old_time_cs - Original time in centiseconds
 * @param new_time_cs - New time in centiseconds
 * @returns Improvement percentage (positive = improved/faster)
 */
export function calculateImprovement(old_time_cs: number, new_time_cs: number): number {
  if (!old_time_cs || old_time_cs <= 0) return 0;

  const improvement = ((old_time_cs - new_time_cs) / old_time_cs) * 100;
  return Number(improvement.toFixed(2));
}
