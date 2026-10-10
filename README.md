# SmartCity Traffic Brain (working title)

A React + Vite single-page app (no backend) that runs an **AI traffic command centre** on a
deterministic, **simulated** city. The landing page is one live dashboard; the ten original AI
experiments are modules inside it and also available as full pages from the sidebar.

    npm install
    npm run dev        # development
    npm run build      # static site in dist/ (Cloudflare Pages: build `npm run build`, output `dist`)

Open the site with `?debug` (for example `/?debug#/`) to expose the simulation as `window.__sim` for testing.

## What is simulated, and what is not
- The city, vehicles, arrivals, weather and training data are **synthetic**. A badge on the dashboard says so.
  No live traffic feed, CCTV or signal hardware is connected (those are optional future integrations).
- Simulation time (advances only while running), wall-clock time (your computer) and real-world data (none) are shown separately.
- "Prolog" on the dashboard is a JavaScript port of `prolog/traffic_signal.pl`, not a running SWI-Prolog process.
  Run the .pl file yourself with `swipl -s prolog/traffic_signal.pl` and `?- report.`
- The Minimax security game is a separate game-theory simulation, not attack detection.
- Alerts are sampled from a small predefined corpus.

## Architecture
```
src/sim/engine.js       one authoritative clock + state: road graph, vehicles, signals, metrics, events
src/sim/network.js      directed road segments, lanes, capacity, signal phase groups
src/sim/controller.js   signal timing: fuzzy controller and rule base (both evaluated, one applied)
src/state.jsx           React bindings (useSyncExternalStore); experiment pages read a snapshot
src/dashboard/          command-centre UI: map, KPIs, controls, AI decision panel, charts, events
src/lib/                the algorithms: search/A*, fuzzy, rules, ANFIS, MLP, perceptron, competitive, n-grams, minimax
src/pages/              the ten experiment pages (unchanged algorithms)
```
One simulation loop (`requestAnimationFrame`, fixed 0.5 s physics step, speed 1x to 8x) drives everything.
Reset replays a seeded 2-minute warm-up so the initial scenario is identical every time.

## How the ten problem statements connect to the simulation
| PS | Where it appears | Uses shared simulation state |
|---|---|---|
| 1 Search | Route planner (dashboard + page) | live road load as cost, closed roads removed |
| 2 Prolog rules | Signal control panel | road load % at the selected intersection |
| 3 Multi-road | Signal control panel, "priority" | queues and waits of competing approaches |
| 4 A* ambulance | Ambulance dispatch | closures, live cost; triggers signal priority |
| 5 Minimax | Security game (separate) | independent |
| 6 Fuzzy signals | Signal control panel, mode "AI · fuzzy" | density and waiting time per approach |
| 7 Street lights | Lighting panel + map layer | simulated clock and road activity |
| 8 Neuro-fuzzy | Forecast panel | weather inputs; optional demand scaling |
| 9 Perceptron / competitive | Vehicles and patterns | live vehicles' features; demand and clock |
| 10 Bigram / trigram | Traffic alerts | seed words chosen from live conditions |

Experiment pages show road density frozen at the moment you open them (press "Update from live simulation" to refresh);
road closures are always live.

## Tests run
A browser test (Playwright driving Edge) covered: dashboard as default, start/pause/reset (time and vehicle
positions), reset determinism, demand and signal-mode effects, block tool, event feed, ambulance dispatch + reroute +
signal priority, chart history, all experiment pages rendering, closure visible on the Ambulance page, and no
horizontal overflow at 390 px. Visual checks were screenshots only.
