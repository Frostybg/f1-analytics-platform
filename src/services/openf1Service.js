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
