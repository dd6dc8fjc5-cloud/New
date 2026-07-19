import { useState } from 'react'
import {
  computeRefreshSchedule,
  computeTimingSchedule,
  refreshMultiplier,
  starterHydration,
  formatTime,
} from '../../lib/sourdough'
import { formatGrams } from '../../lib/calculations'

export default function LievitoMadreCalculator() {
  const [targetGrams, setTargetGrams] = useState('500')
  const [keepAsideGrams, setKeepAsideGrams] = useState('50')
  const [starterParts, setStarterParts] = useState('1')
  const [flourParts, setFlourParts] = useState('1')
  const [waterParts, setWaterParts] = useState('0.5')
  const [refreshCount, setRefreshCount] = useState('3')
  const [mixTime, setMixTime] = useState('06:00')
  const [durationHours, setDurationHours] = useState('4')

  const schedule = computeRefreshSchedule({
    targetGrams,
    keepAsideGrams,
    starterParts,
    flourParts,
    waterParts,
    refreshCount,
  })
  const timing = computeTimingSchedule({ mixTime, refreshCount, durationHours })
  const multiplier = refreshMultiplier({ starterParts, flourParts, waterParts })
  const hydration = starterHydration({ flourParts, waterParts })

  return (
    <div className="page">
      <h2>🫙 Lievito madre</h2>
      <p className="muted">
        Calcola da quanto innesco partire e a che ora fare ogni rinfresco, in base a quanta pasta
        madre matura ti serve per la ricetta.
      </p>

      <div className="scale-box">
        <h3>Quanto ti serve</h3>
        <div className="lm-form-grid">
          <label>
            Lievito madre per la ricetta (g)
            <input
              type="text"
              inputMode="decimal"
              className="num-input"
              value={targetGrams}
              onChange={(e) => setTargetGrams(e.target.value)}
            />
          </label>
          <label>
            Da conservare per il prossimo rinfresco (g)
            <input
              type="text"
              inputMode="decimal"
              className="num-input"
              value={keepAsideGrams}
              onChange={(e) => setKeepAsideGrams(e.target.value)}
            />
          </label>
          <label>
            Numero di rinfreschi
            <input
              type="text"
              inputMode="numeric"
              className="num-input"
              value={refreshCount}
              onChange={(e) => setRefreshCount(e.target.value)}
            />
          </label>
        </div>

        <h3>Rapporto di rinfresco (madre : farina : acqua)</h3>
        <div className="lm-ratio-row">
          <input
            type="text"
            inputMode="decimal"
            className="num-input"
            value={starterParts}
            onChange={(e) => setStarterParts(e.target.value)}
          />
          <span>:</span>
          <input
            type="text"
            inputMode="decimal"
            className="num-input"
            value={flourParts}
            onChange={(e) => setFlourParts(e.target.value)}
          />
          <span>:</span>
          <input
            type="text"
            inputMode="decimal"
            className="num-input"
            value={waterParts}
            onChange={(e) => setWaterParts(e.target.value)}
          />
        </div>
        <p className="muted small">
          Ogni rinfresco moltiplica la massa di <strong>×{multiplier.toFixed(2)}</strong> — idratazione
          stimata della pasta madre a regime: <strong>{hydration.toFixed(0)}%</strong>
        </p>
      </div>

      {schedule.stages.length > 0 && (
        <div className="scale-box">
          <h3>Con cosa iniziare</h3>
          <div className="totals-row totals-row-large">
            <span>
              Innesco di partenza: <strong>{formatGrams(schedule.starterToBeginWith)} g</strong>
            </span>
          </div>

          <table className="ingredient-table">
            <thead>
              <tr>
                <th>Rinfresco</th>
                <th className="num-col">Parti da</th>
                <th className="num-col">+ farina</th>
                <th className="num-col">+ acqua</th>
                <th className="num-col">Ottieni</th>
              </tr>
            </thead>
            <tbody>
              {schedule.stages.map((stage) => (
                <tr key={stage.index}>
                  <td>#{stage.index}</td>
                  <td className="num-col">{formatGrams(stage.input)}</td>
                  <td className="num-col">{formatGrams(stage.flourAdded)}</td>
                  <td className="num-col">{formatGrams(stage.waterAdded)}</td>
                  <td className="num-col">{formatGrams(stage.output)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals-row">
            <span>
              Totale finale: <strong>{formatGrams(schedule.finalTotal)} g</strong>
            </span>
            <span>
              → {formatGrams(targetGrams)} g ricetta + {formatGrams(keepAsideGrams)} g da conservare
            </span>
          </div>
        </div>
      )}

      <div className="scale-box">
        <h3>A che ora impastare</h3>
        <div className="lm-form-grid">
          <label>
            Ora in cui vuoi impastare
            <input
              type="time"
              className="num-input lm-time-input"
              value={mixTime}
              onChange={(e) => setMixTime(e.target.value)}
            />
          </label>
          <label>
            Ore di maturazione per rinfresco
            <input
              type="text"
              inputMode="decimal"
              className="num-input"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
            />
          </label>
        </div>

        {timing.length > 0 && (
          <table className="ingredient-table">
            <thead>
              <tr>
                <th>Rinfresco</th>
                <th className="num-col">Orario</th>
                <th className="num-col">Pronto alle</th>
              </tr>
            </thead>
            <tbody>
              {timing.map((t) => (
                <tr key={t.index}>
                  <td>#{t.index}</td>
                  <td className="num-col">{formatTime(t.startTime)}</td>
                  <td className="num-col">{formatTime(t.readyTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
