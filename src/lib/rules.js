// A tiny rule engine that mirrors prolog/traffic_signal.pl clause for clause.
export const THRESHOLDS = { medium: 30, high: 60 }
export const DURATIONS = { short: 20, medium: 40, long: 60 }

export const PROLOG_SOURCE = `% Traffic density classification and signal duration.

density_level(Road, low)    :- traffic_density(Road, V), V < ${THRESHOLDS.medium}.
density_level(Road, medium) :- traffic_density(Road, V), V >= ${THRESHOLDS.medium}, V < ${THRESHOLDS.high}.
density_level(Road, high)   :- traffic_density(Road, V), V >= ${THRESHOLDS.high}.

signal_for_level(low,    short).
signal_for_level(medium, medium).
signal_for_level(high,   long).

duration_seconds(short,  ${DURATIONS.short}).
duration_seconds(medium, ${DURATIONS.medium}).
duration_seconds(long,   ${DURATIONS.long}).

signal_duration(Road, Length, Seconds) :-
    density_level(Road, Level),
    signal_for_level(Level, Length),
    duration_seconds(Length, Seconds).`

export function classify(v) {
  if (v < THRESHOLDS.medium) return 'low'
  if (v < THRESHOLDS.high) return 'medium'
  return 'high'
}

export const LENGTH_OF = { low: 'short', medium: 'medium', high: 'long' }

// Returns the recommendation and a trace shaped like a Prolog proof.
export function solveSignal(road, vehicles) {
  const level = classify(vehicles)
  const length = LENGTH_OF[level]
  const seconds = DURATIONS[length]
  const clauseNo = { low: 1, medium: 2, high: 3 }[level]
  const trace = [
    { depth: 0, kind: 'call', text: `signal_duration(${road}, Length, Seconds)` },
    { depth: 1, kind: 'call', text: `density_level(${road}, Level)` },
  ]
  const tests = [
    { n: 1, level: 'low', ok: vehicles < THRESHOLDS.medium, text: `${vehicles} < ${THRESHOLDS.medium}` },
    { n: 2, level: 'medium', ok: vehicles >= THRESHOLDS.medium && vehicles < THRESHOLDS.high, text: `${vehicles} >= ${THRESHOLDS.medium}, ${vehicles} < ${THRESHOLDS.high}` },
    { n: 3, level: 'high', ok: vehicles >= THRESHOLDS.high, text: `${vehicles} >= ${THRESHOLDS.high}` },
  ]
  for (const t of tests) {
    trace.push({ depth: 2, kind: 'try', text: `clause ${t.n}: traffic_density(${road}, ${vehicles}), ${t.text}` })
    trace.push({ depth: 2, kind: t.ok ? 'exit' : 'fail', text: t.ok ? `Level = ${t.level}` : 'fails, backtrack' })
    if (t.ok) break
  }
  trace.push({ depth: 1, kind: 'exit', text: `density_level(${road}, ${level})` })
  trace.push({ depth: 1, kind: 'call', text: `signal_for_level(${level}, Length)` })
  trace.push({ depth: 1, kind: 'exit', text: `Length = ${length}` })
  trace.push({ depth: 1, kind: 'call', text: `duration_seconds(${length}, Seconds)` })
  trace.push({ depth: 1, kind: 'exit', text: `Seconds = ${seconds}` })
  trace.push({ depth: 0, kind: 'exit', text: `signal_duration(${road}, ${length}, ${seconds})` })
  return { level, length, seconds, clauseNo, trace }
}
