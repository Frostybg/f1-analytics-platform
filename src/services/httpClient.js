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

/* ---------------------------------------------------------------------------
 * Rate limiting
 * OpenF1 allows a maximum of 3 requests/second. We serialize the *start* of
 * each outbound request so they're spaced just over that threshold apart.
 * A single shared chain throttles all callers (sequential or concurrent)
 * without needing per-call coordination.
 * ------------------------------------------------------------------------- */
const MIN_REQUEST_INTERVAL_MS = 350; // ~2.85 req/s, safely under the 3/s cap
let lastSlotAt = 0;
let slotChain = Promise.resolve();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function acquireSlot() {
  slotChain = slotChain.then(async () => {
    const wait = Math.max(0, lastSlotAt + MIN_REQUEST_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastSlotAt = Date.now();
  });
  return slotChain;
}

/**
 * Perform a GET request and parse the JSON response. Honors the upstream rate
 * limit and retries once if a 429 still slips through.
 *
 * @param {string} url - Fully-qualified URL to request.
 * @param {object} [options]
 * @param {number} [options.timeout=10000] - Abort the request after N ms.
 * @param {number} [options.retriesOn429=1] - Retry attempts for 429 responses.
 * @returns {Promise<any>} Parsed JSON body.
 */
async function getJson(url, { timeout = 10000, retriesOn429 = 1 } = {}) {
  await acquireSlot();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    logger.info(`HTTP GET ${url}`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429 && retriesOn429 > 0) {
      logger.warn(`Rate limited (429) on ${url}; retrying shortly...`);
      clearTimeout(timer);
      await sleep(1000);
      return getJson(url, { timeout, retriesOn429: retriesOn429 - 1 });
    }

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
