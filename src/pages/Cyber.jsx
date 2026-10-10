import { useMemo, useState } from 'react'
import { DEFAULT_SERVERS, analyse, apply, attackerBest, describe, cloneState, MAX_SEC } from '../lib/minimax.js'
import { GateHead, Panel, Howto, Seg } from '../components/Ui.jsx'
import Icon from '../components/Icon.jsx'

const fresh = () => ({ servers: DEFAULT_SERVERS.map((s) => ({ ...s })), res: 3 })

function Pips({ n, max, kind }) {
  return (
    <span className={'pips ' + kind} aria-label={`${n} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
    </span>
  )
}

export default function Cyber() {
  const [state, setState] = useState(fresh)
  const [plies, setPlies] = useState(4)
  const [log, setLog] = useState([])
  const [round, setRound] = useState(1)

  const analysis = useMemo(() => analyse(state, plies), [state, plies])
  const maxV = Math.max(...analysis.options.map((o) => Math.abs(o.value)), 1)
  const lost = state.servers.filter((s) => s.comp)
  const score = state.servers.reduce((a, s) => a + (s.comp ? 0 : s.imp), 0)
  const total = state.servers.reduce((a, s) => a + s.imp, 0)

  // Defender plays the chosen action, then the attacker answers with its own minimax choice.
  const play = (opt) => {
    const afterD = apply(state, opt.action)
    const reply = attackerBest(afterD, Math.max(2, plies - 1))
    const afterA = apply(afterD, reply.action)
    setLog((l) => [{ round, d: describe(state, opt.action), a: describe(afterD, reply.action), comp: afterA.servers.filter((s) => s.comp).length }, ...l])
    setRound((r) => r + 1)
    setState({ ...afterA, res: afterA.res })
  }

  const grantResource = () => setState((s) => ({ ...cloneState(s), res: s.res + 1 }))

  return (
    <div className="page">
      <GateHead tech="Minimax" icon="shield" title="Cyber shield">
        An attacker tries to compromise the traffic control servers. The AI defender picks the move whose worst-case outcome is best, looking several moves ahead.
      </GateHead>

      <div className="layout after">
        <div className="stack">
          <Panel title="Control network" tag="synthetic servers">
            <div className="gridcards">
              {state.servers.map((s) => (
                <div key={s.id} className={'server' + (s.comp ? ' comp' : '')}>
                  <div className="row tight"><b>{s.name}</b><span className="spacer" />{s.comp ? <span className="pill high">compromised</span> : <span className="pill low">secure</span>}</div>
                  <div className="row tight"><span className="lbl" style={{ width: 122 }}>Importance</span><b className="num">{s.imp}</b></div>
                  <div className="row tight"><span className="lbl" style={{ width: 122 }}>Vulnerability</span><Pips n={s.vuln} max={5} kind="vuln" /></div>
                  <div className="row tight"><span className="lbl" style={{ width: 122 }}>Defence</span><Pips n={s.sec} max={MAX_SEC} kind="sec" /></div>
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <div className="metric"><b>{state.res}</b><span>security resources left</span></div>
              <div className="metric"><b>{score}/{total}</b><span>importance still safe</span></div>
              <span className="spacer" />
              <button className="btn ghost" onClick={grantResource}>+1 resource</button>
              <button className="btn ghost" onClick={() => { setState(fresh()); setLog([]); setRound(1) }}><Icon name="reset" size={18} />New game</button>
            </div>
          </Panel>

          <Panel title="Defender's options" tag={`${plies} plies deep`}>
            <div className="row" style={{ marginBottom: 14 }}>
              <span className="lbl">Look-ahead</span>
              <Seg label="Search depth" value={plies} onChange={setPlies} options={[{ value: 2, label: '2 plies' }, { value: 4, label: '4 plies' }, { value: 6, label: '6 plies' }]} />
            </div>
            <table>
              <thead><tr><th>Defender move</th><th style={{ width: '38%' }}>Minimax value</th><th>Expected continuation</th><th /></tr></thead>
              <tbody>
                {analysis.options.map((o, i) => (
                  <tr key={i} className={i === 0 ? 'sel' : ''}>
                    <td><b>{o.text}</b>{i === 0 && <span className="pill blue" style={{ marginLeft: 8 }}>best</span>}</td>
                    <td>
                      <div className="row tight">
                        <div className="bar" style={{ flex: 1 }}><i style={{ width: `${Math.max(4, ((o.value + maxV) / (2 * maxV)) * 100)}%`, background: o.value < 0 ? 'var(--high)' : 'var(--yellow)' }} /></div>
                        <span className="num" style={{ minWidth: '4.6ch', textAlign: 'right', fontWeight: 800 }}>{o.value.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="note">{o.pv.slice(1).map((p) => `${p.who === 'D' ? 'you' : 'foe'}: ${p.text}`).join(' → ') || '-'}</td>
                    <td className="r"><button className={'btn sm' + (i ? ' ghost' : '')} onClick={() => play(o)}>Play</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="metrics" style={{ marginTop: 14 }}>
              <div className="metric"><b>{analysis.fullNodes}</b><span>states without pruning</span></div>
              <div className="metric"><b>{analysis.stats.nodes}</b><span>states with alpha-beta</span></div>
              <div className="metric"><b>{Math.round((1 - analysis.stats.nodes / analysis.fullNodes) * 100)}%</b><span>search saved</span></div>
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Match log" tag={`round ${round}`}>
            {log.length ? (
              <table>
                <thead><tr><th>#</th><th>Defender</th><th>Attacker</th><th className="r">Down</th></tr></thead>
                <tbody>
                  {log.map((l) => (
                    <tr key={l.round}><td className="num">{l.round}</td><td>{l.d}</td><td>{l.a}</td><td className="r num">{l.comp}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">Press Play on a move. The attacker answers with its own minimax choice.</div>
            )}
            {lost.length > 0 && <p className="note" style={{ marginTop: 8 }}>Compromised: {lost.map((s) => s.name).join(', ')}. Restoring costs one resource.</p>}
          </Panel>
          <Howto>
            <p>The defender is <strong>MAX</strong>, the attacker is <strong>MIN</strong>. Each leaf state scores every secure server by its importance (plus a bonus for spare defence) and subtracts the importance of each compromised one.</p>
            <p>An attack succeeds when a server's <strong>vulnerability exceeds its defence</strong>. Otherwise it wears one defence point down. Hardening, restoring and attacking all happen in turn, so the AI must guess what a smart attacker would do next.</p>
            <p><strong>Alpha-beta pruning</strong> skips branches that cannot change the answer: same result, fewer states.</p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
