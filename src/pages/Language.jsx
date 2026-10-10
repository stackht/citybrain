import { useMemo, useState } from 'react'
import { CORPUS, buildModel, generate, nextWords, modelStats, tokenize } from '../lib/ngram.js'
import { GateHead, Panel, Howto, Slider } from '../components/Ui.jsx'
import Icon from '../components/Icon.jsx'

function Probs({ model, words }) {
  const r = nextWords(model, words)
  return (
    <div>
      <p className="note" style={{ marginBottom: 8 }}>Context used: <b className="mono" style={{ color: 'var(--text)' }}>{r.ctx.replace(/<s>/g, '⟨start⟩')}</b></p>
      {r.known ? (
        <table>
          <tbody>
            {r.options.slice(0, 6).map((o) => (
              <tr key={o.word}>
                <td style={{ width: '34%', fontWeight: 700 }}>{o.word === '</s>' ? '⟨end⟩' : o.word}</td>
                <td><div className="bar"><i style={{ width: `${o.p * 100}%` }} /></div></td>
                <td className="r num" style={{ width: '5.5ch' }}>{Math.round(o.p * 100)}%</td>
                <td className="r note num" style={{ width: '4ch' }}>{o.count}×</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty">This context never appears in the corpus, so this model has nothing to predict.</div>
      )}
    </div>
  )
}

function Output({ title, tag, result }) {
  return (
    <Panel title={title} tag={tag}>
      <p className="alertline">{result.text}</p>
    </Panel>
  )
}

export default function Language() {
  const [corpus, setCorpus] = useState(CORPUS)
  const [seedText, setSeedText] = useState('traffic density')
  const [temp, setTemp] = useState(0.8)
  const [seed, setSeed] = useState(3)

  const bi = useMemo(() => buildModel(corpus, 2), [corpus])
  const tri = useMemo(() => buildModel(corpus, 3), [corpus])
  const sb = modelStats(bi)
  const st = modelStats(tri)
  const words = tokenize(seedText).filter((t) => t !== '.')
  const gb = useMemo(() => generate(bi, seedText, { temperature: temp, seed }), [bi, seedText, temp, seed])
  const gt = useMemo(() => generate(tri, seedText, { temperature: temp, seed }), [tri, seedText, temp, seed])

  return (
    <div className="page">
      <GateHead gate="10" icon="chat" title="Tiny language models for traffic alerts">
        A micro model (bigram, one previous word) and a small model (trigram, two previous words) learn from a few dozen traffic sentences, then predict and write short alerts. No GPU needed.
      </GateHead>

      <div className="layout after">
        <div className="stack">
          <Panel title="Start a sentence" tag="same seed, both models">
            <div className="field">
              <label htmlFor="seed">Words so far</label>
              <input id="seed" type="text" value={seedText} onChange={(e) => setSeedText(e.target.value)} placeholder="e.g. heavy congestion" />
            </div>
            <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
              <div style={{ minWidth: 220, flex: 1 }}><Slider label="Temperature" value={temp} min={0.1} max={2} step={0.05} onChange={setTemp} hint="low = safest word, high = more variety" /></div>
              <button className="btn" onClick={() => setSeed((s) => s + 1)}><Icon name="reset" size={18} />Generate again</button>
            </div>
            <div className="row tight" style={{ marginTop: 12 }}>
              {['traffic density', 'heavy congestion', 'the ambulance', 'road conditions', 'please avoid'].map((s) => (
                <button key={s} className="btn ghost sm" onClick={() => setSeedText(s)}>{s}</button>
              ))}
            </div>
          </Panel>

          <div className="row" style={{ alignItems: 'stretch' }}>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}><Output title="µLM output" tag="bigram" result={gb} /></div>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}><Output title="SLM output" tag="trigram" result={gt} /></div>
          </div>

          <Panel title="Next-word probabilities" tag={`after “${words.slice(-2).join(' ') || '…'}”`}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <h3 style={{ marginBottom: 8 }}>µLM: sees 1 word</h3>
                <Probs model={bi} words={words} />
              </div>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <h3 style={{ marginBottom: 8 }}>SLM: sees 2 words</h3>
                <Probs model={tri} words={words} />
              </div>
            </div>
          </Panel>

          <Panel title="Training corpus" tag="synthetic · editable">
            <textarea rows={8} value={corpus} onChange={(e) => setCorpus(e.target.value)} aria-label="Training corpus, one sentence per line" />
            <p className="note" style={{ marginTop: 6 }}>One sentence per line. Edit it and both models retrain instantly.</p>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Model size">
            <table>
              <thead><tr><th /><th className="r">µLM</th><th className="r">SLM</th></tr></thead>
              <tbody>
                <tr><td>Contexts stored</td><td className="r num">{sb.contexts}</td><td className="r num">{st.contexts}</td></tr>
                <tr><td>Transitions</td><td className="r num">{sb.transitions}</td><td className="r num">{st.transitions}</td></tr>
                <tr><td>Vocabulary</td><td className="r num">{sb.vocab}</td><td className="r num">{st.vocab}</td></tr>
              </tbody>
            </table>
          </Panel>
          <Howto>
            <p>A language model estimates <strong>P(next word | previous words)</strong> by counting.</p>
            <span className="formula">bigram:  P(w₃ | w₂)<br />trigram: P(w₃ | w₁, w₂)</span>
            <p>The trigram sees more context, so its sentences hold together better, but it has seen fewer exact contexts. Type a phrase the corpus never uses and the SLM runs dry before the µLM does.</p>
            <p>Both are tiny enough to run on a roadside controller. Large models need far more memory and compute.</p>
          </Howto>
        </div>
      </div>
    </div>
  )
}
