import { roundGrams } from './calculations'

// Rapporto di rinfresco espresso in parti (es. 1 : 1 : 0.5 = madre : farina : acqua).
// Moltiplicatore = quante volte cresce la massa ad ogni rinfresco.
export function refreshMultiplier({ starterParts, flourParts, waterParts }) {
  const s = Number(starterParts) || 0
  const f = Number(flourParts) || 0
  const w = Number(waterParts) || 0
  if (s <= 0) return 0
  return (s + f + w) / s
}

// Idratazione approssimativa della pasta madre a regime (acqua/farina del rapporto di rinfresco).
export function starterHydration({ flourParts, waterParts }) {
  const f = Number(flourParts) || 0
  const w = Number(waterParts) || 0
  if (f <= 0) return 0
  return (w / f) * 100
}

// Calcola, partendo dal peso di lievito madre maturo che serve (ricetta + eventuale
// quota da conservare per il prossimo rinfresco), quanto innesco serve all'inizio
// e il dettaglio farina/acqua da aggiungere ad ogni rinfresco.
export function computeRefreshSchedule({
  targetGrams,
  keepAsideGrams = 0,
  starterParts,
  flourParts,
  waterParts,
  refreshCount,
}) {
  const M = refreshMultiplier({ starterParts, flourParts, waterParts })
  const s = Number(starterParts) || 0
  const f = Number(flourParts) || 0
  const w = Number(waterParts) || 0
  const n = Math.max(0, Math.round(Number(refreshCount) || 0))
  const finalTotal = (Number(targetGrams) || 0) + (Number(keepAsideGrams) || 0)

  if (!M || !finalTotal || n <= 0) {
    return { starterToBeginWith: 0, stages: [], finalTotal, multiplier: M }
  }

  const starterToBeginWith = finalTotal / Math.pow(M, n)

  const stages = []
  let input = starterToBeginWith
  for (let i = 1; i <= n; i += 1) {
    const flourAdded = (input / s) * f
    const waterAdded = (input / s) * w
    const output = input + flourAdded + waterAdded
    stages.push({
      index: i,
      input: roundGrams(input),
      flourAdded: roundGrams(flourAdded),
      waterAdded: roundGrams(waterAdded),
      output: roundGrams(output),
    })
    input = output
  }

  return {
    starterToBeginWith: roundGrams(starterToBeginWith),
    stages,
    finalTotal: roundGrams(finalTotal),
    multiplier: M,
  }
}

// Calcola l'orario di ogni rinfresco partendo all'indietro dall'ora di impasto desiderata.
// mixTime: "HH:MM". durationHours: ore che ogni rinfresco impiega a maturare.
// Ritorna un array di { index, startTime, readyTime } in ordine cronologico (rinfresco 1 per primo).
export function computeTimingSchedule({ mixTime, refreshCount, durationHours }) {
  const n = Math.max(0, Math.round(Number(refreshCount) || 0))
  const hours = Number(durationHours) || 0
  if (!mixTime || n <= 0 || !hours) return []

  const [h, m] = mixTime.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return []

  const durationMs = hours * 60 * 60 * 1000
  let readyTime = new Date(2000, 0, 1, h, m, 0)

  const reversed = []
  for (let i = n; i >= 1; i -= 1) {
    const startTime = new Date(readyTime.getTime() - durationMs)
    reversed.push({ index: i, startTime: new Date(startTime), readyTime: new Date(readyTime) })
    readyTime = startTime
  }

  return reversed.reverse()
}

export function formatTime(date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}
