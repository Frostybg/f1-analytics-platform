'use strict';

/**
 * Race Details controller.
 *
 * GET /race/:meetingKey                        → server-rendered page
 * GET /race/:meetingKey/session/:sessionKey    → JSON results (client fetch)
 *
 * API call budget per page load (4 total, 2 sequential phases):
 *  Phase 1 (parallel): meeting data  +  sessions for this meeting
 *  Phase 2 (parallel): all year meetings (→ round #)  +  initial results
 */

const openf1Service = require('../services/openf1Service');
const { getCircuitInfo } = require('../utils/circuitMap');
const logger = require('../utils/logger');

// Priority order for the default results tab on page load.
const SESSION_PRIORITY = ['Race', 'Qualifying', 'Sprint', 'Sprint Qualifying',
  'Practice 3', 'Practice 2', 'Practice 1'];

function pickDefaultSession(sessions) {
  const now = Date.now();
  const completed = sessions.filter(
    (s) => s.date_start && new Date(s.date_start).getTime() < now,
  );
  if (!completed.length) return null;
  for (const name of SESSION_PRIORITY) {
    const found = completed.find((s) => s.session_name === name);
    if (found) return found;
  }
  return completed[completed.length - 1];
}

/**
 * Format a date range label: "14–16 Mar 2026" / "30 May – 1 Jun 2026".
 * Uses UTC to match the OpenF1 timestamps.
 */
function formatDateRange(sessions) {
  const ts = sessions.map((s) => s.date_start).filter(Boolean).map((d) => new Date(d).getTime());
  if (!ts.length) return null;
  const start = new Date(Math.min(...ts));
  const end   = new Date(Math.max(...ts));
  const optsY = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  if (start.toDateString() === end.toDateString()) return start.toLocaleDateString('en-GB', optsY);
  const sFmt = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()
    ? start.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' })
    : start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${sFmt}–${end.toLocaleDateString('en-GB', optsY)}`;
}

const raceController = {
  async showRacePage(req, res, next) {
    try {
      const meetingKey = Number.parseInt(req.params.meetingKey, 10);
      if (Number.isNaN(meetingKey)) {
        const err = new Error('Invalid meeting key.'); err.status = 404; return next(err);
      }

      // ── Phase 1: meeting + sessions ──────────────────────────────────────
      const data = await openf1Service.getRaceWeekendData(meetingKey);
      if (!data) {
        const err = new Error(`Race weekend ${meetingKey} not found.`); err.status = 404; return next(err);
      }
      const { meeting, sessions } = data;
      const rawDefault = pickDefaultSession(sessions);
      const year = meeting.year || new Date().getFullYear();

      // ── Phase 2: all year meetings (round #) + initial results ──────────
      const [allMeetingsRaw, initialResults] = await Promise.all([
        openf1Service.getMeetings({ year }),
        rawDefault
          ? openf1Service.getSessionResults(rawDefault.session_key).catch((e) => {
              logger.warn(`Initial results unavailable: ${e.message}`); return [];
            })
          : Promise.resolve([]),
      ]);

      // Compute round number (exclude pre-season testing by name pattern)
      const raceMeetings = (Array.isArray(allMeetingsRaw) ? allMeetingsRaw : [])
        .filter((m) => !/(test|testing|pre.?season)/i.test(m.meeting_name || ''))
        .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
      const roundIdx = raceMeetings.findIndex((m) => m.meeting_key === meetingKey);
      const roundNumber = roundIdx >= 0 ? roundIdx + 1 : null;

      // Circuit timezone offset (e.g. "+03:00") from the raw meeting record
      const gmtOffset = meeting.gmt_offset || null;

      // Enrich sessions: pass ISO dateStart for client-side TZ formatting
      const enrichedSessions = sessions.map((s) => ({
        sessionKey: s.session_key,
        sessionName: s.session_name || s.session_type || 'Session',
        sessionType: s.session_type || '',
        dateStart: s.date_start || null,
        isCompleted: s.date_start ? new Date(s.date_start).getTime() < Date.now() : false,
      }));

      const defaultSession = rawDefault
        ? {
            sessionKey: rawDefault.session_key,
            sessionName: rawDefault.session_name || rawDefault.session_type || 'Session',
            sessionType: rawDefault.session_type || '',
          }
        : null;

      const circuitInfo = getCircuitInfo(meeting.location, meeting.circuit_short_name);
      const dateRangeLabel = formatDateRange(sessions);

      res.render('pages/race-details', {
        title: meeting.meeting_name || 'Race Details',
        active: 'calendar',
        meeting: {
          meetingKey: meeting.meeting_key,
          meetingName: meeting.meeting_name || meeting.location || 'Race Weekend',
          location: meeting.location || null,
          countryName: meeting.country_name || null,
          circuitShortName: meeting.circuit_short_name || null,
          year,
        },
        roundNumber,
        gmtOffset,
        sessions: enrichedSessions,
        defaultSession,
        initialResults,
        circuitInfo,
        dateRangeLabel,
      });
    } catch (error) {
      logger.error(`Race page failed for meeting ${req.params.meetingKey}: ${error.message}`);
      next(error);
    }
  },

  async getSessionResultsData(req, res) {
    const sessionKey = Number.parseInt(req.params.sessionKey, 10);
    if (Number.isNaN(sessionKey)) {
      return res.status(400).json({ error: 'Invalid session key.' });
    }
    try {
      const results = await openf1Service.getSessionResults(sessionKey);
      res.json({ results });
    } catch (error) {
      logger.error(`Session results failed for ${sessionKey}: ${error.message}`);
      res.status(error.status || 502).json({ error: 'Unable to load session results. Please try again.' });
    }
  },
};

module.exports = raceController;
