# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
React (Vite), client-side only, no backend. Confirmed by user. Plus a standalone Prolog file (.pl) for the rule-based signal advisor.

## Users
Students and examiners in an AI / Soft Computing (AISC) course who must demonstrate 10 practicals in one coherent mini-project, and viewers who want to understand how each classical AI technique works by manipulating it. (Inferred from the brief; labelled as assumption.)

## Product Purpose
One city-traffic platform where ten AI techniques cooperate on a shared city map: graph search, Prolog-style rules, A* ambulance routing, Minimax cyber-defence, fuzzy signal control, fuzzy street lighting, neuro-fuzzy traffic prediction, perceptron + competitive learning, and bigram/trigram micro language models. Success: every problem statement is runnable, visible, and explainable in the browser, and an "emergency scenario" chains them together.

## Positioning
Not ten isolated demos: the modules feed each other through one shared city (density from the forecaster and classifier drives rules and fuzzy control, which set path costs for A*, which triggers language-model alerts, all guarded by the Minimax defence).

## Capabilities and Constraints
- All algorithms run in the browser in JavaScript; no server.
- Prolog advisor ships as `prolog/traffic_signal.pl` and is mirrored by an in-browser rule engine with an inference trace.
- Project name is a placeholder ("SmartCity Traffic Brain"); the user will rename it later, so the name must be a single config constant.
- Data (roads, corpus, training samples) is synthetic and must be labelled so.

## Brand Commitments
None yet. Name is provisional.

## Evidence on Hand
The ten problem statements supplied by the user. No real traffic datasets, no real city data; none may be fabricated as real.

## Product Principles
1. Show the algorithm working, not just its result.
2. One shared city, many modules.
3. Every module explains itself in plain words.
4. Honest about synthetic data.

## Accessibility & Inclusion
Keyboard-usable controls, sufficient contrast, readable on a projector in a classroom.
