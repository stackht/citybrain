// The ten practicals as gates on the concourse.
export const GATES = [
  { id: 'route', gate: '1', label: 'Route search', icon: 'route', ps: 'Autonomous navigation as a search problem', method: 'States, actions, path cost · BFS, UCS, Greedy, A*' },
  { id: 'rules', gate: '2·3', wide: true, label: 'Signal rules', icon: 'rules', ps: 'Traffic signal duration from density', method: 'Prolog facts and rules' },
  { id: 'ambulance', gate: '4', label: 'Ambulance A*', icon: 'ambulance', ps: 'Ambulance route avoiding closed roads', method: 'A* with an admissible heuristic' },
  { id: 'cyber', gate: '5', label: 'Cyber defence', icon: 'shield', ps: 'Defender vs attacker on critical servers', method: 'Minimax with alpha-beta pruning' },
  { id: 'fuzzysignal', gate: '6', label: 'Fuzzy signal', icon: 'signal', ps: 'Adaptive green-light duration', method: 'Mamdani fuzzy controller' },
  { id: 'streetlight', gate: '7', label: 'Street light', icon: 'bulb', ps: 'Street light brightness', method: 'Fuzzy inference, centroid defuzzification' },
  { id: 'neurofuzzy', gate: '8', label: 'Neuro-fuzzy', icon: 'brain', ps: 'Traffic from temperature and humidity', method: 'Hybrid ANFIS: least squares + gradient descent' },
  { id: 'learning', gate: '9', label: 'Learning rules', icon: 'perceptron', ps: 'Vehicle classes and traffic patterns', method: 'Perceptron and competitive learning' },
  { id: 'language', gate: '10', label: 'Alert writer', icon: 'chat', ps: 'Traffic alerts on low-resource devices', method: 'Bigram µLM and trigram SLM' },
]
