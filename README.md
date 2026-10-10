# SmartCity Traffic Brain (working title)

One React site, no backend, covering 10 AI practicals on a shared synthetic city.
Rename it in `src/config.js`.

    npm install
    npm run dev        # development
    npm run build      # static site in dist/

| Gate | Practical | Code |
|---|---|---|
| 1 | Route search (BFS/UCS/Greedy/A*) | `src/lib/search.js`, `src/pages/RouteSearch.jsx` |
| 2·3 | Prolog signal rules | `prolog/traffic_signal.pl`, `src/lib/rules.js` |
| 4 | Ambulance A* | `src/pages/Ambulance.jsx` |
| 5 | Minimax cyber defence | `src/lib/minimax.js` |
| 6 | Fuzzy signal controller | `src/lib/fuzzy.js` |
| 7 | Fuzzy street lights | `src/lib/fuzzy.js` |
| 8 | Neuro-fuzzy (ANFIS) | `src/lib/anfis.js` |
| 9 | Perceptron + competitive learning | `src/lib/neural.js` |
| 10 | Bigram µLM + trigram SLM | `src/lib/ngram.js` |

Run the Prolog file: `swipl -s prolog/traffic_signal.pl` then `?- report.`
All data is synthetic.
