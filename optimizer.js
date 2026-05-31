/**
 * portfolio-optimizer · optimizer.js
 *
 * Modern Portfolio Theory (Markowitz, 1952)
 * -----------------------------------------
 * - Monte Carlo simulation: 3,000 random portfolios
 * - Efficient frontier visualization (Chart.js scatter)
 * - Max-Sharpe and Min-Variance identification
 * - Interactive weight sliders with live recalculation
 *
 * To extend: replace ASSETS / CORR with real data fetched
 * from a market-data API (e.g. Yahoo Finance, Alpha Vantage).
 */

"use strict";

/* ─── Asset universe ─────────────────────────────────────────────── */

const ASSETS = [
  { name: "SPY", label: "S&P 500",     ret: 0.110, vol: 0.150, color: "#378ADD" },
  { name: "QQQ", label: "Nasdaq 100",  ret: 0.130, vol: 0.200, color: "#1D9E75" },
  { name: "BND", label: "US Bonds",    ret: 0.030, vol: 0.040, color: "#EF9F27" },
  { name: "GLD", label: "Gold",        ret: 0.070, vol: 0.160, color: "#D85A30" },
  { name: "VNQ", label: "Real Estate", ret: 0.080, vol: 0.180, color: "#7F77DD" },
  { name: "TLT", label: "Long Bonds",  ret: 0.040, vol: 0.140, color: "#D4537E" },
];

/** 6×6 correlation matrix (symmetric). */
const CORR = [
//  SPY   QQQ   BND   GLD   VNQ   TLT
  [ 1.00, 0.85,-0.05, 0.05, 0.65,-0.15],  // SPY
  [ 0.85, 1.00,-0.10, 0.00, 0.55,-0.20],  // QQQ
  [-0.05,-0.10, 1.00, 0.15, 0.05, 0.85],  // BND
  [ 0.05, 0.00, 0.15, 1.00, 0.05, 0.10],  // GLD
  [ 0.65, 0.55, 0.05, 0.05, 1.00,-0.05],  // VNQ
  [-0.15,-0.20, 0.85, 0.10,-0.05, 1.00],  // TLT
];

const N        = ASSETS.length;
const RF       = 0.05;          // risk-free rate
const N_SIM    = 3_000;         // Monte Carlo draws

/* ─── Core math ──────────────────────────────────────────────────── */

/** Covariance between assets i and j. */
function cov(i, j) {
  return CORR[i][j] * ASSETS[i].vol * ASSETS[j].vol;
}

/**
 * Compute portfolio statistics from weight vector.
 * @param {number[]} w - weight array summing to ~1
 * @returns {{ ret: number, vol: number, sharpe: number }}
 */
function portfolioStats(w) {
  const ret = w.reduce((sum, wi, i) => sum + wi * ASSETS[i].ret, 0);
  let variance = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      variance += w[i] * w[j] * cov(i, j);
    }
  }
  const vol = Math.sqrt(Math.max(0, variance));
  return { ret, vol, sharpe: (ret - RF) / vol };
}

/** Generate a random weight vector summing to 1. */
function randomWeights() {
  const raw = Array.from({ length: N }, () => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(x => x / sum);
}

/* ─── Monte Carlo simulation ─────────────────────────────────────── */

const portfolios = [];
let maxSharpePort = null;
let minVariancePort = null;

for (let i = 0; i < N_SIM; i++) {
  const w  = randomWeights();
  const st = portfolioStats(w);
  const p  = { ...st, w: [...w] };
  portfolios.push(p);
  if (!maxSharpePort  || st.sharpe < maxSharpePort.sharpe  ? false : true) maxSharpePort  = p;
  if (!minVariancePort || st.vol    < minVariancePort.vol)                   minVariancePort = p;
}

// Re-derive correctly (the inline conditional above is fragile)
maxSharpePort   = portfolios.reduce((best, p) => p.sharpe > best.sharpe ? p : best, portfolios[0]);
minVariancePort = portfolios.reduce((best, p) => p.vol    < best.vol    ? p : best, portfolios[0]);

/* ─── Colour helpers ─────────────────────────────────────────────── */

const sharpeValues = portfolios.map(p => p.sharpe);
const sharpeMin    = Math.min(...sharpeValues);
const sharpeMax    = Math.max(...sharpeValues);

/** Map a Sharpe ratio to a color along a grey→teal ramp. */
function sharpeColor(s) {
  const t = Math.max(0, Math.min(1, (s - sharpeMin) / (sharpeMax - sharpeMin)));
  const r = Math.round(180 * (1 - t) + t *  29);
  const g = Math.round(160 * (1 - t) + t * 158);
  const b = Math.round(160 * (1 - t) + t * 117);
  return `rgba(${r},${g},${b},${(0.25 + t * 0.25).toFixed(2)})`;
}

const isDark  = window.matchMedia("(prefers-color-scheme: dark)").matches;
const tickCol = isDark ? "#888780" : "#5F5E5A";
const gridCol = isDark ? "rgba(68,68,65,0.4)" : "rgba(211,209,199,0.4)";

/* ─── State ──────────────────────────────────────────────────────── */

let W = Array(N).fill(1 / N);   // current weights

/* ─── Chart references ───────────────────────────────────────────── */

let frontierChart = null;
let allocChart    = null;

/* ─── Build charts ───────────────────────────────────────────────── */

function initCharts() {
  const cs = portfolioStats(W);

  /* Efficient frontier scatter */
  const fCtx = document.getElementById("frontierChart").getContext("2d");
  frontierChart = new Chart(fCtx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Random portfolios",
          data: portfolios.map(p => ({
            x: parseFloat((p.vol * 100).toFixed(2)),
            y: parseFloat((p.ret * 100).toFixed(2)),
          })),
          pointRadius: 2,
          pointHoverRadius: 3,
          backgroundColor: portfolios.map(p => sharpeColor(p.sharpe)),
          borderColor: "transparent",
          order: 2,
        },
        {
          label: "Max Sharpe",
          data: [{ x: +(maxSharpePort.vol * 100).toFixed(2), y: +(maxSharpePort.ret * 100).toFixed(2) }],
          pointRadius: 9, pointHoverRadius: 11,
          pointStyle: "triangle",
          backgroundColor: "#1D9E75",
          borderColor: "#fff", borderWidth: 1.5,
          order: 0,
        },
        {
          label: "Min Variance",
          data: [{ x: +(minVariancePort.vol * 100).toFixed(2), y: +(minVariancePort.ret * 100).toFixed(2) }],
          pointRadius: 8, pointHoverRadius: 10,
          pointStyle: "rectRot",
          backgroundColor: "#378ADD",
          borderColor: "#fff", borderWidth: 1.5,
          order: 0,
        },
        {
          label: "Current",
          data: [{ x: +(cs.vol * 100).toFixed(2), y: +(cs.ret * 100).toFixed(2) }],
          pointRadius: 11, pointHoverRadius: 13,
          pointStyle: "circle",
          backgroundColor: "#EF9F27",
          borderColor: "#fff", borderWidth: 2,
          order: -1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: item => item.datasetIndex > 0,
          callbacks: {
            title: items => items[0].dataset.label,
            label: item => `Return: ${item.parsed.y.toFixed(1)}%  |  Vol: ${item.parsed.x.toFixed(1)}%`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Volatility (%)", color: tickCol, font: { size: 11 } },
          ticks: { color: tickCol, font: { size: 10 }, callback: v => v + "%" },
          grid:  { color: gridCol },
        },
        y: {
          title: { display: true, text: "Expected Return (%)", color: tickCol, font: { size: 11 } },
          ticks: { color: tickCol, font: { size: 10 }, callback: v => v + "%" },
          grid:  { color: gridCol },
        },
      },
    },
  });

  /* Allocation bar chart */
  const aCtx = document.getElementById("allocChart").getContext("2d");
  allocChart = new Chart(aCtx, {
    type: "bar",
    data: {
      labels: ASSETS.map(a => a.name),
      datasets: [{
        label: "Weight",
        data: W.map(w => parseFloat((w * 100).toFixed(1))),
        backgroundColor: ASSETS.map(a => a.color + "BB"),
        borderColor:     ASSETS.map(a => a.color),
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: item => `${item.parsed.x.toFixed(1)}%` } },
      },
      scales: {
        x: {
          min: 0, max: 100,
          ticks: { color: tickCol, font: { size: 10 }, callback: v => v + "%" },
          grid:  { color: gridCol },
        },
        y: {
          ticks: { color: tickCol, font: { size: 12 } },
          grid:  { display: false },
        },
      },
    },
  });
}

/* ─── Sliders ────────────────────────────────────────────────────── */

function buildSliders() {
  const container = document.getElementById("sliders-container");
  container.innerHTML = "";
  ASSETS.forEach((asset, i) => {
    const wrap = document.createElement("div");
    wrap.className = "slider-row";
    wrap.innerHTML = `
      <div class="slider-header">
        <span class="sl-name">
          <span class="sl-dot" style="background:${asset.color};"></span>
          ${asset.label}
        </span>
        <span class="sl-pct" id="pct-${i}">${(W[i] * 100).toFixed(1)}%</span>
      </div>
      <input type="range" min="0" max="100" step="0.5"
             value="${(W[i] * 100).toFixed(1)}" id="sl-${i}" />
      <div class="sl-hint">
        <span>ret ${(asset.ret * 100).toFixed(0)}%</span>
        <span>vol ${(asset.vol * 100).toFixed(0)}%</span>
      </div>`;
    wrap.querySelector("input").addEventListener("input", e => onSlider(i, e.target.value));
    container.appendChild(wrap);
  });
}

function onSlider(i, rawVal) {
  W[i] = parseFloat(rawVal) / 100;
  const el = document.getElementById(`pct-${i}`);
  if (el) el.textContent = (W[i] * 100).toFixed(1) + "%";
  updateAll();
}

/* ─── Update metrics & charts ────────────────────────────────────── */

function updateAll() {
  const s     = portfolioStats(W);
  const total = W.reduce((a, b) => a + b, 0);

  document.getElementById("m-ret").textContent    = (s.ret * 100).toFixed(1) + "%";
  document.getElementById("m-vol").textContent    = (s.vol * 100).toFixed(1) + "%";
  document.getElementById("m-sharpe").textContent = s.sharpe.toFixed(2);
  document.getElementById("total-pct").textContent = (total * 100).toFixed(1);

  if (frontierChart) {
    frontierChart.data.datasets[3].data = [{
      x: parseFloat((s.vol * 100).toFixed(2)),
      y: parseFloat((s.ret * 100).toFixed(2)),
    }];
    frontierChart.update("none");
  }

  if (allocChart) {
    allocChart.data.datasets[0].data = W.map(w => parseFloat((w * 100).toFixed(1)));
    allocChart.update("none");
  }
}

/* ─── Apply a new weight vector ──────────────────────────────────── */

function setWeights(newW) {
  W = [...newW];
  ASSETS.forEach((_, i) => {
    const sl  = document.getElementById(`sl-${i}`);
    const pct = document.getElementById(`pct-${i}`);
    if (sl)  sl.value       = (W[i] * 100).toFixed(1);
    if (pct) pct.textContent = (W[i] * 100).toFixed(1) + "%";
  });
  updateAll();
}

/* ─── Button handlers ────────────────────────────────────────────── */

document.getElementById("btn-eq").onclick   = () => setWeights(Array(N).fill(1 / N));
document.getElementById("btn-maxs").onclick = () => setWeights(maxSharpePort.w);
document.getElementById("btn-minv").onclick = () => setWeights(minVariancePort.w);
document.getElementById("btn-norm").onclick = () => {
  const sum = W.reduce((a, b) => a + b, 0);
  if (sum > 0) setWeights(W.map(w => w / sum));
};

/* ─── Boot ───────────────────────────────────────────────────────── */

buildSliders();
initCharts();
updateAll();
