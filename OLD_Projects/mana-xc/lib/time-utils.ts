// lib/time-utils.ts
// Time formatting utilities for Mana XC (centiseconds format)

/**
 * Format centiseconds to MM:SS.CC
 * @param cs - Time in centiseconds (e.g., 96000 = 16:00.00)
 * @returns Formatted time string (e.g., "16:00.00")
 */
export function formatTime(cs: number): string {
  if (!cs || cs <= 0) return '--:--';

  const minutes = Math.floor(cs / 6000);
  const seconds = Math.floor((cs % 6000) / 100);
  const centiseconds = cs % 100;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

/**
 * Format centiseconds to MM:SS (no centiseconds)
 * @param cs - Time in centiseconds
 * @returns Formatted time string (e.g., "16:00")
 */
export function formatTimeShort(cs: number): string {
  if (!cs || cs <= 0) return '--:--';

  const minutes = Math.floor(cs / 6000);
  const seconds = Math.floor((cs % 6000) / 100);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse time string (MM:SS.CC or MM:SS) to centiseconds
 * @param timeString - Time string (e.g., "16:00.50" or "16:00")
 * @returns Time in centiseconds
 */
export function parseTime(timeString: string): number | null {
  if (!timeString || timeString.trim() === '') return null;

  const parts = timeString.split(':');
  if (parts.length !== 2) return null;

  const minutes = parseInt(parts[0], 10);
  const secondsParts = parts[1].split('.');
  const seconds = parseInt(secondsParts[0], 10);
  const centiseconds = secondsParts.length > 1 ? parseInt(secondsParts[1].padEnd(2, '0'), 10) : 0;

  if (isNaN(minutes) || isNaN(seconds) || isNaN(centiseconds)) return null;

  return minutes * 6000 + seconds * 100 + centiseconds;
}

/**
 * Format pace per mile
 * @param cs - Time in centiseconds
 * @param miles - Distance in miles
 * @returns Formatted pace string (e.g., "5:30/mi")
 */
export function formatPace(cs: number, miles: number): string {
  if (!cs || !miles || miles <= 0) return '--:--';

  const paceCs = cs / miles;
  return formatTimeShort(Math.round(paceCs)) + '/mi';
}
