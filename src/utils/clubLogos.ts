/**
 * Maps club abbreviations (from extra.abbr) to local logo paths in /public/logos/.
 * Add entries here as club logos become available.
 * Falls back to Google favicon service for any club not listed.
 */
export const CLUB_LOGOS: Record<string, string> = {
  GB: '/logos/GB.png',
  GBE: '/logos/GBE.png',
  GD: '/logos/GD.png',
  GS: '/logos/GS.png',
};
