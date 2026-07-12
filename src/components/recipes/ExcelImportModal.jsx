import { useState } from 'react'
import * as XLSX from 'xlsx'
import RecipeForm from './RecipeForm'

function pickField(row, candidates) {
  const keys = Object.keys(row)
  for (const candidate of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === candidate)
    if (found) return row[found]
  }
  return undefined
}

function parseWorkbook(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  return rows
    .map((row) => {
      const name = pickField(row, ['ingrediente', 'nome', 'ingredient', 'name'])
      const grams = pickField(row, ['grammi', 'grams', 'g', 'quantita', 'quantità', 'qty'])
      return { name: String(name ?? '').trim(), grams: Number(grams) || 0 }
    })
    .filter((r) => r.name)
}

export default function ExcelImportModal({ ingredientsMap, onSaved, onCancel }) {
  const [step, setStep] = useState('upload')
  const [parsedRows, setParsedRows] = useState([])
  const [suggestedName, setSuggestedName] = useState('')
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const buffer = await file.arrayBuffer()
      const rows = parseWorkbook(buffer)
      if (rows.length === 0) {
        setError('Nessuna riga valida trovata. Assicurati che il file abbia colonne "ingrediente" e "grammi".')
        return
      }
      setParsedRows(rows)
      setSuggestedName(file.name.replace(/\.(xlsx|xls|csv)$/i, ''))
      setStep('confirm')
    } catch (err) {
      setError('Impossibile leggere il file. Verifica che sia un Excel valido (.xlsx/.xls).')
    }
  }

  if (step === 'confirm') {
    return (
      <RecipeForm
        title="Conferma ricetta importata da Excel"
        initialName={suggestedName}
        initialIngredients={parsedRows}
        ingredientsMap={ingredientsMap}
        onSaved={onSaved}
        onCancel={onCancel}
      />
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>Importa ricetta da Excel</h2>
        <p className="muted">
          Il file deve avere due colonne: <strong>ingrediente</strong> e <strong>grammi</strong> (prima riga = intestazioni).
        </p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
        {error && <div className="error-box">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
