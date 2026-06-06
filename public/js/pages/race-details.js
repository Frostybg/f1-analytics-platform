'use strict';

/**
 * Race Details — client-side results table + local timezone schedule.
 *
 * On boot:
 *  1. Re-formats all schedule times into the visitor's local timezone.
 *  2. Renders the SSR-provided initial results (no extra request).
 *
 * On session change:
 *  - Checks the in-memory cache first.
 *  - Fetches /race/:meetingKey/session/:sessionKey only when not cached.
 *
 * Results default:
 *  - Shows top 5 rows.
 *  - "Show All / Show Less" toggle reveals/hides the remaining rows.
 */

(function () {
  const { meetingKey, defaultSessionKey, gmtOffset, sessions, initialResults } = window.F1_RACE || {};
  if (!meetingKey) return;

  const sessionMap = new Map(sessions.map((s) => [s.sessionKey, s]));

  // ── Cache ─────────────────────────────────────────────────────────────
  const cache = new Map();
  if (defaultSessionKey != null && Array.isArray(initialResults) && initialResults.length) {
    cache.set(defaultSessionKey, initialResults);
  }

  // ── DOM refs ──────────────────────────────────────────────────────────
  const select      = document.getElementById('sessionSelect');
  const loading     = document.getElementById('resultsLoading');
  const errState    = document.getElementById('resultsError');
  const errMsg      = document.getElementById('resultsErrorMsg');
  const emptyState  = document.getElementById('resultsEmpty');
  const tableWrap   = document.getElementById('resultsTable');
  const thead       = document.getElementById('resultsHead');
  const tbody       = document.getElementById('resultsBody');
  const toggleRow   = document.getElementById('resultsToggleRow');
  const toggleBtn   = document.getElementById('resultsToggleBtn');
  const tzLabel     = document.getElementById('scheduleTimezoneLabel');

  // ── Timezone helpers ──────────────────────────────────────────────────
  function localTzName() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ');
    } catch (_) { return 'local time'; }
  }

  function formatLocal(isoStr) {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    const day  = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return { day, time };
  }

  // ── Schedule: re-format rows in local TZ ─────────────────────────────
  function localiseSchedule() {
    const tz = localTzName();
    if (tzLabel) tzLabel.textContent = `All times in your local timezone (${tz})`;

    document.querySelectorAll('.f1-schedule-row[data-datetime]').forEach((row) => {
      const iso = row.getAttribute('data-datetime');
      if (!iso) return;
      const fmt = formatLocal(iso);
      if (!fmt) return;
      const dayEl  = row.querySelector('.f1-schedule-day');
      const timeEl = row.querySelector('.f1-schedule-time');
      if (dayEl)  dayEl.textContent  = fmt.day;
      if (timeEl) timeEl.textContent = fmt.time;
    });
  }

  // ── Lap-time helpers ─────────────────────────────────────────────────
  function formatLapTime(seconds) {
    if (seconds == null || seconds <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(3).padStart(6, '0');
    return m > 0 ? `${m}:${s}` : `${s}`;
  }

  function formatGap(gap) {
    if (gap == null || gap <= 0) return null;
    return `+${gap.toFixed(3)}`;
  }

  // ── Column schema ─────────────────────────────────────────────────────
  function getColumns(sessionType, sessionName, results) {
    const type = (sessionType || '').trim();
    const isRace = type === 'Race' && sessionName !== 'Sprint';
    const isSprint = sessionName === 'Sprint';
    const isQuali = type === 'Qualifying';
    const isPractice = type === 'Practice';

    // Base columns for every session type
    const cols = [
      { key: 'pos',    label: 'Pos',    num: true  },
      { key: 'driverNo', label: 'No',   num: true  },
      { key: 'driver', label: 'Driver', num: false },
      { key: 'team',   label: 'Team',   num: false },
    ];

    if (isRace || isSprint) {
      cols.push({ key: 'laps',   label: 'Laps', num: true });
      cols.push({ key: 'points', label: 'Pts',  num: true });
      cols.push({ key: 'timeGap', label: 'Time / Gap', num: true });
    }

    // Add lap-time columns only when the data actually has times
    const hasDuration = results.some((r) => r.duration != null && r.duration > 0);
    if ((isQuali || isPractice) && hasDuration) {
      cols.push({ key: 'bestLap', label: 'Best Lap', num: true });
    }

    return cols;
  }

  // ── State visibility ──────────────────────────────────────────────────
  function showOnly(id) {
    [loading, errState, emptyState, tableWrap].forEach((el) => el.setAttribute('hidden', ''));
    document.getElementById(id).removeAttribute('hidden');
  }

  // ── Expand / collapse state ───────────────────────────────────────────
  const PREVIEW_ROWS = 5;
  let expanded = false;

  function applyExpand() {
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((tr, i) => {
      if (i < PREVIEW_ROWS) {
        tr.removeAttribute('hidden');
      } else {
        if (expanded) tr.removeAttribute('hidden');
        else tr.setAttribute('hidden', '');
      }
    });
  }

  function updateToggleBtn(total) {
    if (total <= PREVIEW_ROWS) {
      toggleRow.setAttribute('hidden', '');
      return;
    }
    toggleRow.removeAttribute('hidden');
    if (expanded) {
      toggleBtn.innerHTML = 'Show Less <span class="f1-toggle-arrow">&#9650;</span>';
    } else {
      toggleBtn.innerHTML = `Show All <span class="f1-toggle-arrow">&#9660;</span>`;
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      applyExpand();
      updateToggleBtn(tbody.querySelectorAll('tr').length);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────
  function renderResults(results, session) {
    if (!results || results.length === 0) { showOnly('resultsEmpty'); return; }

    expanded = false;
    const name = session.sessionName || '';
    const type = (session.sessionType || '').trim();
    const cols = getColumns(session.sessionType, name, results);

    // For Race/Sprint: find leader lap count to detect lapped drivers
    const leaderLaps = (type === 'Race' && name !== 'Sprint') || name === 'Sprint'
      ? results.find((r) => r.position === 1)?.laps ?? null
      : null;

    // Build <thead>
    const headRow = document.createElement('tr');
    cols.forEach((c) => {
      const th = document.createElement('th');
      th.textContent = c.label;
      if (c.num) th.className = 'f1-col-num';
      headRow.appendChild(th);
    });
    thead.innerHTML = '';
    thead.appendChild(headRow);

    // Build <tbody>
    tbody.innerHTML = '';
    results.forEach((r) => {
      const tr = document.createElement('tr');
      if (r.dnf || r.dns || r.dsq) tr.classList.add('f1-row-retirement');

      cols.forEach((c) => {
        const td = document.createElement('td');
        if (c.num) td.className = 'f1-col-num';

        switch (c.key) {
          case 'pos':
            td.innerHTML = buildPosCell(r);
            break;
          case 'driverNo':
            td.textContent = r.driverNumber != null ? r.driverNumber : '—';
            break;
          case 'driver':
            td.innerHTML = buildDriverCell(r);
            break;
          case 'team':
            td.textContent = r.teamName || '—';
            break;
          case 'laps':
            td.textContent = r.laps != null ? r.laps : '—';
            break;
          case 'points':
            td.textContent = (r.points != null && r.points > 0) ? r.points : '—';
            break;
          case 'timeGap': {
            // For Race/Sprint: P1 shows duration, lapped drivers show lap count, others show gap
            if (r.position === 1) {
              const t = formatLapTime(r.duration);
              td.textContent = t || '—';
            } else if (leaderLaps != null && r.laps != null && r.laps < leaderLaps) {
              // Driver is lapped: show +N LAP(S)
              const lapDiff = leaderLaps - r.laps;
              td.textContent = `+${lapDiff} ${lapDiff === 1 ? 'LAP' : 'LAPS'}`;
            } else {
              const g = formatGap(r.gapToLeader);
              td.textContent = g || '—';
            }
            break;
          }
          case 'bestLap': {
            // For Qualifying/Practice: show duration
            const t = formatLapTime(r.duration);
            td.textContent = t || '—';
            break;
          }
          default:
            td.textContent = '—';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    applyExpand();
    updateToggleBtn(results.length);
    showOnly('resultsTable');
  }

  function buildPosCell(r) {
    if (r.dns) return `<span class="f1-result-badge is-retirement">DNS</span>`;
    if (r.dsq) return `<span class="f1-result-badge is-retirement">DSQ</span>`;
    if (r.dnf) return `<span class="f1-result-badge is-retirement">DNF</span>`;
    if (r.position == null) return '<span class="text-secondary">—</span>';
    const cls = r.position <= 3 ? ' is-podium' : '';
    return `<span class="f1-result-badge${cls}">${r.position}</span>`;
  }

  function buildDriverCell(r) {
    const dot = r.teamColour
      ? `<span class="f1-team-dot" style="background:${r.teamColour}"></span>` : '';
    const acr = r.nameAcronym
      ? `<span class="f1-driver-acronym">${r.nameAcronym}</span>` : '';
    return `<span class="f1-driver-cell">${dot}<span class="f1-driver-fullname">${r.fullName}</span>${acr}</span>`;
  }

  // ── Fetch ─────────────────────────────────────────────────────────────
  async function loadSession(sessionKey) {
    if (cache.has(sessionKey)) return cache.get(sessionKey);
    showOnly('resultsLoading');
    const res = await fetch(`/race/${meetingKey}/session/${sessionKey}`, {
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    const results = Array.isArray(json.results) ? json.results : [];
    cache.set(sessionKey, results);
    return results;
  }

  async function switchTo(sessionKey) {
    const session = sessionMap.get(sessionKey);
    if (!session) return;
    try {
      const results = await loadSession(sessionKey);
      renderResults(results, session);
    } catch (err) {
      errMsg.textContent = err.message || 'Unable to load results.';
      showOnly('resultsError');
    }
  }

  // ── Event binding ─────────────────────────────────────────────────────
  select.addEventListener('change', () => switchTo(Number(select.value)));

  // ── Boot ──────────────────────────────────────────────────────────────
  localiseSchedule();

  if (defaultSessionKey != null && cache.has(defaultSessionKey)) {
    renderResults(initialResults, sessionMap.get(defaultSessionKey) || { sessionType: 'Race', sessionName: 'Race' });
  } else {
    showOnly('resultsEmpty');
  }
}());
