'use strict';

/**
 * Circuit map — maintainable lookup from OpenF1 location names to circuit
 * metadata and SVG layout filenames.
 *
 * Keys are the values OpenF1 returns in meeting.location (primary) or
 * meeting.circuit_short_name (fallback).  SVG files live in
 * public/img/circuits/.  Entries with svgFile: null have no layout image.
 *
 * To add a new circuit:
 *   1. Drop an SVG file into public/img/circuits/<filename>
 *   2. Add or update an entry here keyed on the OpenF1 location string.
 */
const CIRCUIT_MAP = {
  // ── Australia ──────────────────────────────────────────────────────────
  Melbourne: {
    svgFile: 'melbourne.svg',
    circuitName: 'Albert Park Circuit',
    country: 'Australia',
    city: 'Melbourne',
  },
  // ── Bahrain ────────────────────────────────────────────────────────────
  Sakhir: {
    svgFile: 'bahrain.svg',
    circuitName: 'Bahrain International Circuit',
    country: 'Bahrain',
    city: 'Sakhir',
  },
  // ── Saudi Arabia ───────────────────────────────────────────────────────
  Jeddah: {
    svgFile: 'jeddah.svg',
    circuitName: 'Jeddah Corniche Circuit',
    country: 'Saudi Arabia',
    city: 'Jeddah',
  },
  // ── Japan ──────────────────────────────────────────────────────────────
  Suzuka: {
    svgFile: 'suzuka.svg',
    circuitName: 'Suzuka Circuit',
    country: 'Japan',
    city: 'Suzuka',
  },
  // ── China ──────────────────────────────────────────────────────────────
  Shanghai: {
    svgFile: 'shanghai.svg',
    circuitName: 'Shanghai International Circuit',
    country: 'China',
    city: 'Shanghai',
  },
  // ── USA (Miami) ────────────────────────────────────────────────────────
  Miami: {
    svgFile: 'miami.svg',
    circuitName: 'Miami International Autodrome',
    country: 'USA',
    city: 'Miami',
  },
  // ── Italy (Imola) ─ no SVG available ───────────────────────────────────
  Imola: {
    svgFile: null,
    circuitName: 'Autodromo Enzo e Dino Ferrari',
    country: 'Italy',
    city: 'Imola',
  },
  // ── Monaco ─────────────────────────────────────────────────────────────
  Monaco: {
    svgFile: 'monaco.svg',
    circuitName: 'Circuit de Monaco',
    country: 'Monaco',
    city: 'Monte Carlo',
  },
  // ── Spain (Barcelona) ──────────────────────────────────────────────────
  Barcelona: {
    svgFile: 'catalunya.svg',
    circuitName: 'Circuit de Barcelona-Catalunya',
    country: 'Spain',
    city: 'Barcelona',
  },
  // ── Canada ─────────────────────────────────────────────────────────────
  Montreal: {
    svgFile: 'montreal.svg',
    circuitName: 'Circuit Gilles Villeneuve',
    country: 'Canada',
    city: 'Montreal',
  },
  // ── Austria ────────────────────────────────────────────────────────────
  Spielberg: {
    svgFile: 'spielberg.svg',
    circuitName: 'Red Bull Ring',
    country: 'Austria',
    city: 'Spielberg',
  },
  // ── Great Britain ──────────────────────────────────────────────────────
  Silverstone: {
    svgFile: 'silverstone.svg',
    circuitName: 'Silverstone Circuit',
    country: 'Great Britain',
    city: 'Silverstone',
  },
  // ── Hungary ────────────────────────────────────────────────────────────
  Budapest: {
    svgFile: 'hungaroring.svg',
    circuitName: 'Hungaroring',
    country: 'Hungary',
    city: 'Budapest',
  },
  // ── Belgium ────────────────────────────────────────────────────────────
  'Spa-Francorchamps': {
    svgFile: 'spa-francorchamps.svg',
    circuitName: 'Circuit de Spa-Francorchamps',
    country: 'Belgium',
    city: 'Spa-Francorchamps',
  },
  // ── Netherlands ────────────────────────────────────────────────────────
  Zandvoort: {
    svgFile: 'zandvoort.svg',
    circuitName: 'Circuit Zandvoort',
    country: 'Netherlands',
    city: 'Zandvoort',
  },
  // ── Italy (Monza) ──────────────────────────────────────────────────────
  Monza: {
    svgFile: 'monza.svg',
    circuitName: 'Autodromo Nazionale Monza',
    country: 'Italy',
    city: 'Monza',
  },
  // ── Azerbaijan ─────────────────────────────────────────────────────────
  Baku: {
    svgFile: 'baku.svg',
    circuitName: 'Baku City Circuit',
    country: 'Azerbaijan',
    city: 'Baku',
  },
  // ── Singapore ──────────────────────────────────────────────────────────
  Singapore: {
    svgFile: 'marina-bay.svg',
    circuitName: 'Marina Bay Street Circuit',
    country: 'Singapore',
    city: 'Singapore',
  },
  // ── USA (Austin) ───────────────────────────────────────────────────────
  Austin: {
    svgFile: 'austin.svg',
    circuitName: 'Circuit of the Americas',
    country: 'USA',
    city: 'Austin',
  },
  // ── Mexico ─────────────────────────────────────────────────────────────
  'Mexico City': {
    svgFile: 'mexico-city.svg',
    circuitName: 'Autodromo Hermanos Rodriguez',
    country: 'Mexico',
    city: 'Mexico City',
  },
  // ── Brazil ─────────────────────────────────────────────────────────────
  'São Paulo': {
    svgFile: 'interlagos.svg',
    circuitName: 'Autodromo Jose Carlos Pace',
    country: 'Brazil',
    city: 'São Paulo',
  },
  // ── USA (Las Vegas) ────────────────────────────────────────────────────
  'Las Vegas': {
    svgFile: 'las-vegas.svg',
    circuitName: 'Las Vegas Strip Street Circuit',
    country: 'USA',
    city: 'Las Vegas',
  },
  // ── Qatar ──────────────────────────────────────────────────────────────
  Lusail: {
    svgFile: 'lusail.svg',
    circuitName: 'Lusail International Circuit',
    country: 'Qatar',
    city: 'Lusail',
  },
  // ── UAE ────────────────────────────────────────────────────────────────
  'Abu Dhabi': {
    svgFile: 'yas-marina.svg',
    circuitName: 'Yas Marina Circuit',
    country: 'UAE',
    city: 'Abu Dhabi',
  },
  // ── Spain (Madrid) — new for 2026 ──────────────────────────────────────
  Madrid: {
    svgFile: 'madring.svg',
    circuitName: 'Circuit de Madrid',
    country: 'Spain',
    city: 'Madrid',
  },
};

/**
 * Resolve circuit metadata for a given race weekend.
 * Tries `location` first, then partial-match on `circuitShortName`.
 *
 * @param {string|null} location
 * @param {string|null} circuitShortName
 * @returns {{ svgFile, circuitName, country, city } | null}
 */
function getCircuitInfo(location, circuitShortName) {
  if (location && CIRCUIT_MAP[location]) return CIRCUIT_MAP[location];
  if (circuitShortName) {
    const lower = circuitShortName.toLowerCase();
    const found = Object.values(CIRCUIT_MAP).find(
      (c) => c.circuitName.toLowerCase().includes(lower)
        || lower.includes(c.city.toLowerCase()),
    );
    if (found) return found;
  }
  return null;
}

module.exports = { getCircuitInfo, CIRCUIT_MAP };
