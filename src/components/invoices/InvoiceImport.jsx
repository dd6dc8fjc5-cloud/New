import { useState } from 'react'
import * as XLSX from 'xlsx'
import { useIngredients } from '../../hooks/useIngredients'
import { upsertIngredientsBatch } from '../../lib/firestoreApi'
import { normalizeIngredientKey, formatPricePerKg } from '../../lib/calculations'

function pickField(row, candidates) {
  const keys = Object.keys(row)
  for (const candidate of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === candidate)
    if (found) return row[found]
  }
  return undefined
}

function toKg(quantity, unit) {
  const q = Number(quantity) || 0
  const u = (unit || '').toString().trim().toLowerCase()
  if (u === 'g' || u === 'gr' || u === 'grammi') return q / 1000
  return q // kg di default
}

function parseInvoiceRows(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return rows
    .map((row) => {
      const name = String(pickField(row, ['articolo', 'nome', 'prodotto', 'descrizione', 'ingrediente']) ?? '').trim()
      const directPricePerKg = pickField(row, ['prezzo_kg', 'prezzo al kg', 'prezzo/kg', 'prezzo kg', '€/kg'])
      const quantity = pickField(row, ['quantita', 'quantità', 'qty', 'kg', 'peso'])
      const unit = pickField(row, ['unita', 'unità', 'um', 'unit'])
      const totalPrice = pickField(row, ['prezzo', 'importo', 'totale', 'prezzo totale'])

      let pricePerKg = null
      if (directPricePerKg !== undefined && directPricePerKg !== '') {
        pricePerKg = Number(directPricePerKg) || 0
      } else if (quantity !== undefined && totalPrice !== undefined) {
        const qtyKg = toKg(quantity, unit)
        pricePerKg = qtyKg > 0 ? Number(totalPrice) / qtyKg : 0
      }

      return { name, pricePerKg: pricePerKg != null ? Math.round(pricePerKg * 1000) / 1000 : null }
    })
    .filter((r) => r.name && r.pricePerKg != null && !Number.isNaN(r.pricePerKg))
}

export default function InvoiceImport() {
  const { ingredientsMap } = useIngredients()
  const [step, setStep] = useState('upload') // upload | preview | done
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseInvoiceRows(buffer)
      if (parsed.length === 0) {
        setError(
          'Nessuna riga valida trovata. Servono colonne "articolo" + "prezzo_kg", oppure "articolo" + "quantità" + "prezzo".',
        )
        return
      }
      const withStatus = parsed.map((r) => ({
        ...r,
        existed: Boolean(ingredientsMap[normalizeIngredientKey(r.name)]),
        oldPrice: ingredientsMap[normalizeIngredientKey(r.name)]?.pricePerKg ?? null,
      }))
      setRows(withStatus)
      setStep('preview')
    } catch (err) {
      setError('Impossibile leggere il file. Verifica che sia un Excel valido (.xlsx/.xls).')
    }
  }

  async function confirmImport() {
    setBusy(true)
    try {
      const result = await upsertIngredientsBatch(rows)
      setSummary(result)
      setStep('done')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setStep('upload')
    setRows([])
    setSummary(null)
    setError('')
  }

  return (
    <div className="page">
      <h2>Fatture fornitore</h2>

      {step === 'upload' && (
        <>
          <p className="muted">
            Carica una fattura in Excel. L'app calcola il prezzo al kg e aggiorna automaticamente il database
            ingredienti (li crea se non esistono già).
          </p>
          <p className="muted small">
            Colonne riconosciute: <strong>articolo</strong> + <strong>prezzo_kg</strong>, oppure{' '}
            <strong>articolo</strong> + <strong>quantità</strong> + <strong>prezzo</strong> (+ <strong>unità</strong>{' '}
            facoltativa, kg o g).
          </p>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          {error && <div className="error-box">{error}</div>}
        </>
      )}

      {step === 'preview' && (
        <>
          <h3>Anteprima ({rows.length} articoli)</h3>
          <table className="ingredient-table">
            <thead>
              <tr>
                <th>Articolo</th>
                <th className="num-col">Nuovo €/kg</th>
                <th className="num-col">Prezzo precedente</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td className="num-col">{formatPricePerKg(r.pricePerKg)}</td>
                  <td className="num-col">{r.oldPrice != null ? formatPricePerKg(r.oldPrice) : '—'}</td>
                  <td>{r.existed ? '🔄 Aggiornato' : '✨ Nuovo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={reset} disabled={busy}>
              Annulla
            </button>
            <button className="btn btn-primary" onClick={confirmImport} disabled={busy}>
              {busy ? 'Importazione…' : 'Conferma e importa'}
            </button>
          </div>
        </>
      )}

      {step === 'done' && summary && (
        <>
          <div className="success-box">✓ Importazione completata.</div>
          <h3>Riepilogo</h3>
          {summary.created.length > 0 && (
            <>
              <h4>✨ Ingredienti creati ({summary.created.length})</h4>
              <ul className="summary-list">
                {summary.created.map((r, i) => (
                  <li key={i}>
                    {r.name} — {formatPricePerKg(r.pricePerKg)} €/kg
                  </li>
                ))}
              </ul>
            </>
          )}
          {summary.updated.length > 0 && (
            <>
              <h4>🔄 Prezzi aggiornati ({summary.updated.length})</h4>
              <ul className="summary-list">
                {summary.updated.map((r, i) => (
                  <li key={i}>
                    {r.name}: {r.oldPrice != null ? formatPricePerKg(r.oldPrice) : '—'} → {formatPricePerKg(r.pricePerKg)} €/kg
                  </li>
                ))}
              </ul>
            </>
          )}
          <button className="btn btn-primary" onClick={reset}>
            Importa un'altra fattura
          </button>
        </>
      )}
    </div>
  )
}
