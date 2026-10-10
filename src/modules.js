// The features of the one combined system, grouped by what they do for the city.
// `ps` lists which of the ten source problem statements each feature covers (used on the About page).
export const GROUPS = [
  { id: 'sense', label: 'Sense', blurb: 'Know what the city is about to do.' },
  { id: 'decide', label: 'Decide', blurb: 'Choose routes and signal timings.' },
  { id: 'act', label: 'Act', blurb: 'Control lights and tell people.' },
  { id: 'protect', label: 'Protect', blurb: 'Keep the control system safe.' },
]

export const FEATURES = [
  { id: 'neurofuzzy', group: 'sense', label: 'Congestion forecast', icon: 'brain', does: 'Predicts how busy the roads will be from temperature and humidity.', tech: 'Neuro-fuzzy (ANFIS)', ps: [8] },
  { id: 'learning', group: 'sense', label: 'Vehicles and patterns', icon: 'perceptron', does: 'Recognises vehicle types and discovers daily traffic patterns.', tech: 'Perceptron + competitive learning', ps: [9] },
  { id: 'route', group: 'decide', label: 'Route planner', icon: 'route', does: 'Finds the best way across the city for any vehicle.', tech: 'State-space search', ps: [1] },
  { id: 'ambulance', group: 'decide', label: 'Ambulance dispatch', icon: 'ambulance', does: 'Routes an ambulance around blocked roads and construction.', tech: 'A* search', ps: [4] },
  { id: 'rules', group: 'decide', label: 'Signal advisor', icon: 'rules', does: 'Classifies road density and recommends a signal length.', tech: 'Prolog rules', ps: [2, 3] },
  { id: 'fuzzysignal', group: 'decide', label: 'Adaptive signals', icon: 'signal', does: 'Sets green time from density and how long cars have waited.', tech: 'Fuzzy controller', ps: [6] },
  { id: 'streetlight', group: 'act', label: 'Street lighting', icon: 'bulb', does: 'Dims or brightens lamps from daylight and street activity.', tech: 'Fuzzy inference', ps: [7] },
  { id: 'language', group: 'act', label: 'Alert desk', icon: 'chat', does: 'Writes short traffic alerts on a tiny device, no cloud needed.', tech: 'Bigram and trigram language models', ps: [10] },
  { id: 'cyber', group: 'protect', label: 'Cyber shield', icon: 'shield', does: 'Chooses how to defend control servers from an attacker.', tech: 'Minimax', ps: [5] },
]

// The 10 source problem statements, in the order they were given.
export const SOURCE_PS = [
  { n: 1, text: 'Autonomous vehicle navigation as an AI search problem (states, actions, path costs)', feature: 'route' },
  { n: 2, text: 'Prolog: traffic signal duration from traffic density (low, medium, high)', feature: 'rules' },
  { n: 3, text: 'Prolog: smart traffic system deciding signal duration for several roads', feature: 'rules' },
  { n: 4, text: 'A*: ambulance route avoiding blocked roads and construction zones', feature: 'ambulance' },
  { n: 5, text: 'Minimax: defender vs attacker over critical servers', feature: 'cyber' },
  { n: 6, text: 'Fuzzy logic controller for adaptive traffic signal timing', feature: 'fuzzysignal' },
  { n: 7, text: 'Fuzzy system for street light brightness', feature: 'streetlight' },
  { n: 8, text: 'Neuro-fuzzy system predicting traffic from temperature and humidity', feature: 'neurofuzzy' },
  { n: 9, text: 'Perceptron and competitive learning for vehicles and traffic patterns', feature: 'learning' },
  { n: 10, text: 'Bigram micro and trigram small language models for traffic alerts', feature: 'language' },
]

export const featureOf = (id) => FEATURES.find((f) => f.id === id)
