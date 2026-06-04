/* ===========================================================================
   Drivers page
   ---------------------------------------------------------------------------
   Fetches the current grid from /drivers/api and manages four UI states:
   loading, error, empty and success. Cards are built with the DOM API
   (not innerHTML) so driver-provided text is safely escaped.
   =========================================================================== */
(function () {
  'use strict';

  const API_URL = '/drivers/api';

  const els = {
    loading: document.getElementById('driversLoading'),
    error: document.getElementById('driversError'),
    errorMsg: document.getElementById('driversErrorMsg'),
    empty: document.getElementById('driversEmpty'),
    grid: document.getElementById('driversGrid'),
    count: document.getElementById('driversCount'),
    retry: document.getElementById('driversRetry'),
  };

  /** Show exactly one state container, hide the rest. */
  function showState(state) {
    els.loading.hidden = state !== 'loading';
    els.error.hidden = state !== 'error';
    els.empty.hidden = state !== 'empty';
    els.grid.hidden = state !== 'grid';
  }

  /** Build the photo element with an initials fallback on load failure. */
  function buildPhoto(driver) {
    const wrap = document.createElement('div');
    wrap.className = 'f1-driver-photo';

    const fallback = document.createElement('span');
    fallback.className = 'f1-driver-photo-fallback';
    fallback.textContent = driver.nameAcronym || '—';

    if (driver.headshotUrl) {
      const img = document.createElement('img');
      img.src = driver.headshotUrl;
      img.alt = driver.fullName;
      img.loading = 'lazy';
      img.addEventListener('error', function () {
        img.remove();
        wrap.appendChild(fallback);
      });
      wrap.appendChild(img);
    } else {
      wrap.appendChild(fallback);
    }
    return wrap;
  }

  /** Build a single responsive driver card column. */
  function buildCard(driver) {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3 col-xxl-2';

    const card = document.createElement('article');
    card.className = 'f1-driver-card h-100';
    card.style.setProperty('--team-colour', driver.teamColour);

    const number = document.createElement('span');
    number.className = 'f1-driver-number';
    number.textContent = driver.driverNumber != null ? driver.driverNumber : '–';

    const body = document.createElement('div');
    body.className = 'f1-driver-body';

    const name = document.createElement('h2');
    name.className = 'f1-driver-name';
    name.textContent = driver.fullName;

    const team = document.createElement('div');
    team.className = 'f1-driver-team';
    const dot = document.createElement('span');
    dot.className = 'f1-team-dot';
    const teamName = document.createElement('span');
    teamName.textContent = driver.teamName;
    team.appendChild(dot);
    team.appendChild(teamName);

    body.appendChild(name);
    body.appendChild(team);

    card.appendChild(number);
    card.appendChild(buildPhoto(driver));
    card.appendChild(body);
    col.appendChild(card);
    return col;
  }

  function renderDrivers(drivers) {
    els.grid.replaceChildren();
    const fragment = document.createDocumentFragment();
    drivers.forEach((driver) => fragment.appendChild(buildCard(driver)));
    els.grid.appendChild(fragment);

    els.count.textContent = `${drivers.length} drivers`;
    els.count.hidden = false;
    showState('grid');
  }

  async function load() {
    showState('loading');
    els.count.hidden = true;
    try {
      const response = await fetch(API_URL, { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || `Request failed (${response.status}).`);
      }

      const drivers = Array.isArray(payload.drivers) ? payload.drivers : [];
      if (drivers.length === 0) {
        showState('empty');
        return;
      }
      renderDrivers(drivers);
    } catch (err) {
      els.errorMsg.textContent = err.message || 'Something went wrong.';
      showState('error');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (els.retry) els.retry.addEventListener('click', load);
    load();
  });
})();
