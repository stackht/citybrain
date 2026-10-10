# SmartCity Traffic Brain (working title)

One React site, no backend: an **AI traffic command centre** for a synthetic city.
It is a single system whose features share one city, so each feature's output feeds the next.
Rename it in `src/config.js`.

    npm install
    npm run dev        # development
    npm run build      # static site in dist/

## Combined problem statement
Build an AI traffic command centre that forecasts congestion, recognises vehicles and patterns,
plans routes and ambulance dispatch, sets signal timings and street lighting, writes alerts for
people, and defends its control servers from attack.

## Features and the source problem statements they cover
| Feature | Technique | Source PS | Code |
|---|---|---|---|
| Route planner | State-space search (BFS/UCS/Greedy/A*) | 1 | `src/lib/search.js`, `src/pages/RouteSearch.jsx` |
| Signal advisor | Prolog facts and rules | 2, 3 | `prolog/traffic_signal.pl`, `src/lib/rules.js` |
| Ambulance dispatch | A* | 4 | `src/pages/Ambulance.jsx` |
| Cyber shield | Minimax + alpha-beta | 5 | `src/lib/minimax.js` |
| Adaptive signals | Fuzzy controller | 6 | `src/lib/fuzzy.js` |
| Street lighting | Fuzzy inference | 7 | `src/lib/fuzzy.js` |
| Congestion forecast | Neuro-fuzzy (ANFIS) | 8 | `src/lib/anfis.js` |
| Vehicles and patterns | Perceptron + competitive learning | 9 | `src/lib/neural.js` |
| Alert desk | Bigram µLM + trigram SLM | 10 | `src/lib/ngram.js` |
| Emergency drill | All features chained | all | `src/pages/Scenario.jsx` |

The in-app **About** page shows the same mapping for examiners.

Run the Prolog file: `swipl -s prolog/traffic_signal.pl` then `?- report.`
All data is synthetic.
