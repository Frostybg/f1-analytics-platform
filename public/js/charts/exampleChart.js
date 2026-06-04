/* ===========================================================================
   Example Chart.js component
   ---------------------------------------------------------------------------
   Demonstrates the pattern every future chart should follow:
     1. Read server-provided data from a canvas `data-chart` attribute.
     2. Apply the shared F1 theme defaults.
     3. Render with Chart.js.

   This keeps charts data-driven and avoids hard-coding datasets in JS.
   In later phases (Telemetry Center) the same approach renders real OpenF1
   car_data (speed, rpm, throttle, brake, gear, drs).
   =========================================================================== */
(function () {
  'use strict';

  const F1_COLORS = {
    red: '#e10600',
    grid: 'rgba(255, 255, 255, 0.06)',
    ticks: '#9a9aae',
  };

  /**
   * Build a translucent vertical gradient for an area fill.
   */
  function buildGradient(ctx, area, hex) {
    const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    gradient.addColorStop(0, hex + '66'); // ~40% alpha
    gradient.addColorStop(1, hex + '00'); // transparent
    return gradient;
  }

  function renderSpeedChart(canvas) {
    let data;
    try {
      data = JSON.parse(canvas.dataset.chart || '{}');
    } catch (err) {
      console.error('[exampleChart] Invalid chart data:', err);
      return;
    }

    const labels = data.labels || [];
    const speed = data.speed || [];

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Speed (km/h)',
            data: speed,
            borderColor: F1_COLORS.red,
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: true,
            backgroundColor: function (context) {
              const { ctx, chartArea } = context.chart;
              if (!chartArea) return 'transparent';
              return buildGradient(ctx, chartArea, F1_COLORS.red);
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: F1_COLORS.ticks, font: { family: 'Inter' } },
          },
          tooltip: {
            backgroundColor: '#14141c',
            borderColor: '#2c2c3a',
            borderWidth: 1,
            titleColor: '#f3f3f5',
            bodyColor: '#9a9aae',
            callbacks: {
              title: (items) => `Distance: ${items[0].label} m`,
              label: (item) => `Speed: ${item.formattedValue} km/h`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Distance (m)', color: F1_COLORS.ticks },
            grid: { color: F1_COLORS.grid },
            ticks: { color: F1_COLORS.ticks },
          },
          y: {
            title: { display: true, text: 'Speed (km/h)', color: F1_COLORS.ticks },
            grid: { color: F1_COLORS.grid },
            ticks: { color: F1_COLORS.ticks },
            beginAtZero: true,
          },
        },
      },
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof Chart === 'undefined') {
      console.error('[exampleChart] Chart.js is not loaded.');
      return;
    }
    const canvas = document.getElementById('demoSpeedChart');
    if (canvas) renderSpeedChart(canvas);
  });
})();
