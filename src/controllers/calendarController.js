'use strict';

/**
 * Calendar controller.
 *
 * Fetches the full season calendar from openf1Service in two API calls
 * (meetings + sessions), then renders the calendar view server-side.
 * Date formatting is handled here so the EJS template stays clean.
 */

const openf1Service = require('../services/openf1Service');
const logger = require('../utils/logger');

/**
 * Format a date range as a compact human-readable string.
 *   Same month  → "14–16 Mar 2026"
 *   Cross-month → "30 May – 1 Jun 2026"
 */
function formatDateRange(start, end) {
  if (!start) return null;
  const optsYear = { day: 'numeric', month: 'short', year: 'numeric' };
  if (!end || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-GB', optsYear);
  }
  const startFmt =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
      ? start.toLocaleDateString('en-GB', { day: 'numeric' })
      : start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endFmt = end.toLocaleDateString('en-GB', optsYear);
  return `${startFmt}–${endFmt}`;
}

const calendarController = {
  async showCalendarPage(req, res, next) {
    try {
      const year = Number.parseInt(req.query.year, 10) || new Date().getFullYear();
      const { meetings, summary } = await openf1Service.getCalendarData(year);

      // Attach formatted date range to each meeting
      meetings.forEach((m) => {
        m.dateRangeLabel = formatDateRange(m.dateStart, m.dateEnd);
      });

      // Attach short date label to the next-race summary card
      if (summary.nextRace) {
        if (summary.nextRace.dateStart) {
          summary.nextRace.dateLabel = summary.nextRace.dateStart.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          });
          // Also compute and attach the full date range for the card
          summary.nextRace.dateRangeLabel = formatDateRange(
            summary.nextRace.dateStart,
            summary.nextRace.dateEnd,
          );
        }
      }

      res.render('pages/calendar', {
        title: 'Race Calendar',
        active: 'calendar',
        year,
        meetings,
        summary,
      });
    } catch (error) {
      logger.error(`Calendar page failed: ${error.message}`);
      next(error);
    }
  },
};

module.exports = calendarController;
