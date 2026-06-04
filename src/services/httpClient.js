'use strict';

/**
 * Minimal HTTP client built on the native `fetch` API (Node 18+).
 *
 * Centralizing outbound HTTP here means every service shares the same timeout
 * handling, error shape, and JSON parsing. If we ever switch transport
 * (axios, undici, ...) only this file changes.
 */

const logger = require('../utils/logger');

/**
 * Error type thrown for any failed outbound request. Carries an HTTP-style
 * status code so the centralized error handler can translate it for the user.
 */
class HttpError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Perform a GET request and parse the JSON response.
 *
 * @param {string} url - Fully-qualified URL to request.
 * @param {object} [options]
 * @param {number} [options.timeout=10000] - Abort the request after N ms.
 * @returns {Promise<any>} Parsed JSON body.
 */
async function getJson(url, { timeout = 10000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    logger.info(`HTTP GET ${url}`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new HttpError(
        `Upstream request failed with status ${response.status}`,
        response.status,
        { url }
      );
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new HttpError(`Upstream request timed out after ${timeout}ms`, 504, { url });
    }
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(`Upstream request error: ${error.message}`, 502, { url });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { getJson, HttpError };
