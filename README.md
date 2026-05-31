# Portfolio Optimizer

An interactive portfolio optimization tool built on **Modern Portfolio Theory** (Markowitz, 1952). Visualizes the efficient frontier via Monte Carlo simulation and lets you find optimal allocations across six asset classes.

## Features

- **Efficient Frontier** — 3,000 randomly simulated portfolios plotted by risk vs. return
- **Max Sharpe Portfolio** — highest risk-adjusted return (Sharpe ratio, r_f = 5%)
- **Min Variance Portfolio** — lowest achievable volatility
- **Interactive sliders** — adjust weights and see metrics update in real time
- **One-click presets** — Equal Weight · Max Sharpe · Min Variance · Normalize
- **Dark mode** — respects `prefers-color-scheme`

## Asset Universe

| Ticker | Asset Class   | Est. Return | Est. Volatility |
|--------|--------------|-------------|-----------------|
| SPY    | S&P 500      | 11%         | 15%             |
| QQQ    | Nasdaq 100   | 13%         | 20%             |
| BND    | US Bonds     |  3%         |  4%             |
| GLD    | Gold         |  7%         | 16%             |
| VNQ    | Real Estate  |  8%         | 18%             |
| TLT    | Long Bonds   |  4%         | 14%             |

> Returns and correlations are illustrative estimates. Not financial advice.

## Optimization Methods

### Monte Carlo Simulation
3,000 portfolios are generated with random weight vectors (Dirichlet-distributed, summing to 1). Each portfolio's expected return, volatility, and Sharpe ratio are computed from the asset covariance matrix.

### Portfolio Statistics
Given weights **w** and covariance matrix **Σ**:
- **Return**: `μ_p = wᵀ · μ`
- **Volatility**: `σ_p = √(wᵀ Σ w)`
- **Sharpe Ratio**: `S = (μ_p − r_f) / σ_p`

The Max Sharpe and Min Variance portfolios are the Monte Carlo draws that maximize/minimize these values respectively.

## Getting Started

No build step required — pure HTML, CSS, and JavaScript.

```bash
git clone https://github.com/YOUR_USERNAME/portfolio-optimizer.git
cd portfolio-optimizer
open index.html          # macOS
# or: python -m http.server 8000  (then visit localhost:8000)
```

## Project Structure

```
portfolio-optimizer/
├── index.html      # App shell and layout
├── style.css       # Theming, layout, dark mode
├── optimizer.js    # MPT math, Monte Carlo, Chart.js charts
└── README.md
```

## Extending the Model

**Add more assets** — append entries to the `ASSETS` array and expand the `CORR` matrix in `optimizer.js`.

**Use real market data** — replace the static `ASSETS` and `CORR` values with returns from a market-data API (Yahoo Finance, Alpha Vantage, Polygon.io). Fetch historical prices, compute log-returns, and derive the sample covariance matrix.

**Quadratic programming** — for exact efficient frontier computation, replace Monte Carlo with a QP solver (e.g. [`quadprog`](https://github.com/jlmelville/quadprog) or a Python backend with `scipy.optimize`).

**Constraints** — add long-only (`w_i ≥ 0`), sector caps, or maximum position limits by filtering the Monte Carlo draws.

## Dependencies

- [Chart.js 4.4](https://www.chartjs.org/) — loaded from cdnjs, no npm required

## License

MIT
