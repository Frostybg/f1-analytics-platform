'use strict';

/**
 * OpenF1 API service abstraction.
 *
 * This is the single gateway between the application and the OpenF1 REST API
 * (https://openf1.org/). Routes/controllers never build URLs or call `fetch`
 * directly; they call semantic methods here instead. That keeps endpoint
 * knowledge in one place and makes future pages (Drivers, Telemetry, ...)
 * trivial to add by appending new methods.
 *
 * OpenF1 endpoints accept simple query-string filters, e.g.:
 *   /v1/sessions?year=2024&session_type=Race
 *   /v1/drivers?session_key=9158
 *   /v1/car_data?driver_number=1&session_key=9158
 */

const config = require('../config');
const { getJson } = require('./httpClient');

/**
 * Build a full OpenF1 URL from a resource path and a params object,
 * dropping any null/undefined values.
 *
 * @param {string} resource - e.g. "sessions", "drivers", "car_data".
 * @param {object} [params] - Query-string filters.
 * @returns {string}
 */
function buildUrl(resource, params = {}) {
  const url = new URL(`${config.openF1.baseUrl}/${resource}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

/**
 * Low-level fetch against a single OpenF1 resource.
 */
function fetchResource(resource, params = {}) {
  return getJson(buildUrl(resource, params), { timeout: config.openF1.timeout });
}

const DEFAULT_TEAM_COLOUR = '888888';

/**
 * F1 media headshots are served through a transform pipeline whose default
 * "1col" rendition is quite small/soft. Bumping it to a larger rendition
 * yields a noticeably crisper image at no extra integration cost.
 */
function upgradeHeadshotResolution(url) {
  if (!url) return null;
  return url.replace('/1col/', '/4col/');
}

/**
 * Map a raw OpenF1 driver record to a clean, view-friendly shape:
 *  - camelCase keys
 *  - `#`-prefixed team colour (OpenF1 returns it without the hash)
 *  - higher-resolution headshot
 *  - safe fallbacks for missing photo/colour
 */
function normalizeDriver(raw) {
  const colour = (raw.team_colour || DEFAULT_TEAM_COLOUR).replace('#', '');
  return {
    driverNumber: raw.driver_number ?? null,
    fullName: raw.full_name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim(),
    nameAcronym: raw.name_acronym || null,
    teamName: raw.team_name || 'Unknown Team',
    teamColour: `#${colour}`,
    headshotUrl: upgradeHeadshotResolution(raw.headshot_url),
    countryCode: raw.country_code || null,
  };
}

/**
 * Translate a session_result row into a short, human-readable status:
 * DNS / DSQ / DNF take precedence, otherwise a finishing position (e.g. P3).
 */
function formatResultStatus(result) {
  if (result.dns) return 'DNS';
  if (result.dsq) return 'DSQ';
  if (result.dnf) return 'DNF';
  if (result.position != null) return `P${result.position}`;
  return null;
}

/**
 * Combine a raw session with the driver's result into a display object.
 */
function normalizeSessionResult(session, result) {
  const status = formatResultStatus(result);
  return {
    sessionKey: session.session_key,
    sessionName: session.session_name || session.session_type || 'Session',
    location: session.location || session.circuit_short_name || 'Unknown',
    countryName: session.country_name || null,
    countryCode: session.country_code || null,
    date: session.date_start || null,
    status,
    isPodium: result.position != null && result.position <= 3,
    isRetirement: Boolean(result.dnf || result.dns || result.dsq),
    points: typeof result.points === 'number' ? result.points : null,
    laps: typeof result.number_of_laps === 'number' ? result.number_of_laps : null,
  };
}

/**
 * Normalize, de-duplicate (by driver number) and sort a list of raw drivers.
 * Sorted by team name, then by driver number for a tidy grid.
 */
function normalizeDrivers(rawList = []) {
  const byNumber = new Map();
  rawList.forEach((raw) => {
    const driver = normalizeDriver(raw);
    if (driver.driverNumber != null && !byNumber.has(driver.driverNumber)) {
      byNumber.set(driver.driverNumber, driver);
    }
  });

  return Array.from(byNumber.values()).sort((a, b) => {
    const team = a.teamName.localeCompare(b.teamName);
    return team !== 0 ? team : a.driverNumber - b.driverNumber;
  });
}

/* ---------------------------------------------------------------------------
 * Public, semantic API
 * Each future page should add the methods it needs here.
 * ------------------------------------------------------------------------- */

const openf1Service = {
  /**
   * Sessions (practice, qualifying, race, ...) optionally filtered.
   * Used by Home, Race Calendar, Telemetry Center.
   */
  getSessions(params = {}) {
    return fetchResource('sessions', params);
  },

  /**
   * Meetings (Grand Prix weekends) optionally filtered by year/country.
   */
  getMeetings(params = {}) {
    return fetchResource('meetings', params);
  },

  /**
   * Drivers, typically scoped to a session_key.
   */
  getDrivers(params = {}) {
    return fetchResource('drivers', params);
  },

  /**
   * The current driver grid, normalized for display.
   *
   * OpenF1 returns drivers per session, so we use the special `latest`
   * session key to get the most recent grid, then normalize, de-duplicate
   * and sort. Used by the Drivers page.
   */
  async getCurrentDrivers() {
    const raw = await fetchResource('drivers', { session_key: 'latest' });
    return normalizeDrivers(Array.isArray(raw) ? raw : []);
  },

  /**
   * A single driver (from the latest session), normalized for display.
   * Returns null when no matching driver exists. Used by Driver Details.
   */
  async getDriverByNumber(driverNumber) {
    const raw = await fetchResource('drivers', {
      driver_number: driverNumber,
      session_key: 'latest',
    });
    const drivers = normalizeDrivers(Array.isArray(raw) ? raw : []);
    return drivers[0] || null;
  },

  /**
   * Full season data for a single driver: championship standing + recent
   * sessions. Both are derived from a shared set of API calls so the total
   * request count stays the same as the previous single-purpose method.
   *
   * Strategy:
   *  1. Fetch session metadata for the whole season (two requests).
   *  2. For every past meeting, fetch session_result WITHOUT a driver_number
   *     filter — one call returns ALL drivers for that meeting. The results
   *     feed both the standings computation (needs every driver) and the
   *     recent-sessions list (filtered down to this driver).
   *
   * Session-type semantics (2026 OpenF1):
   *  session_type = 'Race'      → both "Race" and "Sprint" (session_name tells them apart)
   *  session_type = 'Qualifying'→ regular Qualifying AND Sprint Qualifying (session_name tells them apart)
   *  session_type = 'Practice'  → all practice sessions
   *
   * Recent-sessions display filter (per requirements):
   *  SHOW : session_type 'Race' (Race + Sprint) | Qualifying where name ≠ 'Sprint Qualifying'
   *  HIDE : Practice | Sprint Qualifying
   */
  async getDriverSeasonData(driverNumber) {
    const latest = await fetchResource('sessions', { session_key: 'latest' });
    const latestSession = Array.isArray(latest) && latest[0] ? latest[0] : null;
    const year = latestSession ? latestSession.year : new Date().getFullYear();
    const cutoff = latestSession && latestSession.date_start
      ? new Date(latestSession.date_start).getTime()
      : Date.now();

    const all = await fetchResource('sessions', { year });
    const pastSessions = (Array.isArray(all) ? all : [])
      .filter((s) => !s.is_cancelled && s.date_start && new Date(s.date_start).getTime() <= cutoff)
      .sort((a, b) => new Date(b.date_start) - new Date(a.date_start));

    const sessionMeta = new Map(pastSessions.map((s) => [s.session_key, s]));
    const meetings = [];
    pastSessions.forEach((s) => {
      if (!meetings.includes(s.meeting_key)) meetings.push(s.meeting_key);
    });

    // Fetch ALL drivers' results per meeting (no driver_number filter).
    // This feeds both standings (needs every driver's points) and
    // recent-sessions (we filter by driver_number in memory below).
    const allResults = [];
    for (const meetingKey of meetings) {
      try {
        const rows = await fetchResource('session_result', { meeting_key: meetingKey });
        if (Array.isArray(rows)) allResults.push(...rows);
      } catch { /* skip failed meeting; degraded gracefully */ }
    }

    // --- Championship standing ----------------------------------------
    // Sum points from Race-type sessions (covers both Race and Sprint) for
    // every driver, sort descending, then locate this driver's position.
    const pointsByDriver = new Map();
    allResults.forEach((result) => {
      const meta = sessionMeta.get(result.session_key);
      if (!meta || meta.session_type !== 'Race') return;
      if (typeof result.points !== 'number') return;
      pointsByDriver.set(
        result.driver_number,
        (pointsByDriver.get(result.driver_number) ?? 0) + result.points,
      );
    });

    const sortedDrivers = [...pointsByDriver.entries()].sort((a, b) => b[1] - a[1]);
    const positionIndex = sortedDrivers.findIndex(([num]) => num === driverNumber);
    const standing = pointsByDriver.has(driverNumber)
      ? {
          points: pointsByDriver.get(driverNumber),
          position: positionIndex >= 0 ? positionIndex + 1 : null,
        }
      : null;

    // --- Recent sessions (this driver, filtered session types) ----------
    const driverResultMap = new Map(
      allResults
        .filter((r) => r.driver_number === driverNumber)
        .map((r) => [r.session_key, r]),
    );

    const recentSessions = pastSessions
      .filter((s) => {
        if (!driverResultMap.has(s.session_key)) return false;
        if (s.session_type === 'Practice') return false;
        if (s.session_type === 'Qualifying' && s.session_name === 'Sprint Qualifying') return false;
        return true;
      })
      .slice(0, 5)
      .map((s) => normalizeSessionResult(s, driverResultMap.get(s.session_key)))
      .filter((s) => s.status !== null);

    return { recentSessions, standing };
  },

  /**
   * Full calendar data for a season: meetings grouped with their sessions.
   *
   * Two API calls total (meetings + sessions for the year), all grouping and
   * enrichment is done in memory so the page needs zero additional requests.
   *
   * Returned shape:
   *   { meetings: Meeting[], summary: { total, completed, remaining, nextRace } }
   *
   * Each Meeting:
   *   meetingKey, meetingName, location, countryName, circuitShortName,
   *   dateStart (Date|null), dateEnd (Date|null), isCompleted, isNext,
   *   round (1-based), sessions: Session[]
   *
   * Each Session:
   *   sessionKey, sessionName, sessionType, dateStart,
   *   isRace, isSprint, isQualifying, isSprintQualifying, isPractice
   */
  async getCalendarData(year) {
    const [rawMeetings, rawSessions] = await Promise.all([
      fetchResource('meetings', { year }),
      fetchResource('sessions', { year }),
    ]);

    const meetings = Array.isArray(rawMeetings) ? rawMeetings : [];
    const sessions = Array.isArray(rawSessions) ? rawSessions : [];
    const now = Date.now();

    // Index sessions by meeting_key, sorted chronologically
    const sessionsByMeeting = new Map();
    sessions.forEach((s) => {
      const key = s.meeting_key;
      if (!sessionsByMeeting.has(key)) sessionsByMeeting.set(key, []);
      sessionsByMeeting.get(key).push(s);
    });
    sessionsByMeeting.forEach((list) =>
      list.sort((a, b) => new Date(a.date_start) - new Date(b.date_start)),
    );

    function classifySession(s) {
      const type = (s.session_type || '').trim();
      const name = (s.session_name || s.session_type || 'Session').trim();
      return {
        sessionKey: s.session_key,
        sessionName: name,
        sessionType: type,
        dateStart: s.date_start || null,
        isRace: type === 'Race' && name !== 'Sprint',
        isSprint: name === 'Sprint',
        isQualifying: type === 'Qualifying' && name !== 'Sprint Qualifying',
        isSprintQualifying: name === 'Sprint Qualifying',
        isPractice: type === 'Practice',
      };
    }

    // A genuine race weekend always contains at least one Race-type session.
    // Pre-season testing meetings only have Practice sessions, so filtering
    // on the presence of a Race session excludes them without needing to
    // inspect meeting names.
    const raceMeetingKeys = new Set(
      sessions
        .filter((s) => (s.session_type || '').trim() === 'Race')
        .map((s) => s.meeting_key),
    );

    const normalizedMeetings = meetings
      .filter((m) => m.meeting_key != null && raceMeetingKeys.has(m.meeting_key))
      .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
      .map((m, idx) => {
        const sess = (sessionsByMeeting.get(m.meeting_key) || []).map(classifySession);

        // Date range: earliest → latest session start time
        const timestamps = sess
          .map((s) => s.dateStart)
          .filter(Boolean)
          .map((d) => new Date(d).getTime());
        const minTs = timestamps.length
          ? Math.min(...timestamps)
          : m.date_start ? new Date(m.date_start).getTime() : null;
        const maxTs = timestamps.length ? Math.max(...timestamps) : minTs;

        // Completed when the Race session start time is in the past
        const raceSession = sess.find((s) => s.isRace);
        const isCompleted = raceSession
          ? Boolean(raceSession.dateStart && new Date(raceSession.dateStart).getTime() < now)
          : maxTs !== null && maxTs < now;

        return {
          meetingKey: m.meeting_key,
          meetingName: m.meeting_name || m.location || `Round ${idx + 1}`,
          location: m.location || null,
          countryName: m.country_name || null,
          circuitShortName: m.circuit_short_name || null,
          dateStart: minTs ? new Date(minTs) : null,
          dateEnd: maxTs ? new Date(maxTs) : null,
          isCompleted,
          isNext: false,
          sessions: sess,
          round: idx + 1,
        };
      });

    // Flag the first upcoming meeting as the "next" race
    const nextIdx = normalizedMeetings.findIndex((m) => !m.isCompleted);
    if (nextIdx >= 0) normalizedMeetings[nextIdx].isNext = true;

    const completedCount = normalizedMeetings.filter((m) => m.isCompleted).length;
    const nextMeeting = nextIdx >= 0 ? normalizedMeetings[nextIdx] : null;

    return {
      meetings: normalizedMeetings,
      summary: {
        total: normalizedMeetings.length,
        completed: completedCount,
        remaining: normalizedMeetings.length - completedCount,
        nextRace: nextMeeting
          ? {
              meetingName: nextMeeting.meetingName,
              location: nextMeeting.location,
              countryName: nextMeeting.countryName,
              round: nextMeeting.round,
              dateStart: nextMeeting.dateStart,
              dateEnd: nextMeeting.dateEnd,
            }
          : null,
      },
    };
  },

  /**
   * High-frequency car telemetry (speed, rpm, throttle, brake, gear, drs).
   * This is the data source for the Telemetry Center in a later phase.
   */
  getCarData(params = {}) {
    return fetchResource('car_data', params);
  },

  /**
   * Escape hatch for resources we haven't wrapped yet. Keeps the service
   * usable while we incrementally add first-class methods.
   */
  raw(resource, params = {}) {
    return fetchResource(resource, params);
  },
};

module.exports = openf1Service;
