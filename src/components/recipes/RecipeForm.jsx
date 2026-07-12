import { useState } from 'react'
import { createRecipe, updateRecipe, upsertIngredient } from '../../lib/firestoreApi'
import { computeRecipeTotals, formatGrams, formatCurrency, normalizeIngredientKey } from '../../lib/calculations'

let rowIdCounter = 0
function makeRow(name = '', grams = '') {
  rowIdCounter += 1
  return { rowId: rowIdCounter, name, grams }
}

export default function RecipeForm({
  title,
  initialName = '',
  initialIngredients = [],
  recipeId = null,
  ingredientsMap,
  onSaved,
  onCancel,
}) {
  const [name, setName] = useState(initialName)
  const [rows, setRows] = useState(() =>
    initialIngredients.length > 0
      ? initialIngredients.map((ing) => makeRow(ing.name, String(ing.grams ?? '')))
      : [makeRow(), makeRow(), makeRow()],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [creatingKey, setCreatingKey] = useState(null)
  const [priceDraft, setPriceDraft] = useState('')

  const cleanIngredients = rows
    .filter((r) => r.name.trim() && Number(r.grams) > 0)
    .map((r) => ({ name: r.name.trim(), grams: Number(r.grams) }))

  const totals = computeRecipeTotals(cleanIngredients, ingredientsMap)

  function updateRow(rowId, field, value) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()])
  }

  function removeRow(rowId) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId))
  }

  async function confirmCreateIngredient(ingName) {
    const price = parseFloat(priceDraft.replace(',', '.'))
    if (Number.isNaN(price) || price < 0) return
    await upsertIngredient(ingName, price)
    setCreatingKey(null)
    setPriceDraft('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Inserisci il nome della ricetta.')
      return
    }
    if (cleanIngredients.length === 0) {
      setError('Aggiungi almeno un ingrediente con i grammi.')
      return
    }
    setSaving(true)
    try {
      if (recipeId) {
        await updateRecipe(recipeId, { name, ingredients: cleanIngredients })
      } else {
        await createRecipe({ name, ingredients: cleanIngredients })
      }
      onSaved?.()
    } catch (err) {
      setError('Errore nel salvataggio. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card recipe-form-card">
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Nome ricetta
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Croissant sfogliato"
              required
            />
          </label>

          <div className="ingredient-form-rows">
            <div className="ingredient-form-header">
              <span>Ingrediente</span>
              <span>Grammi</span>
              <span />
            </div>
            {rows.map((row) => {
              const key = normalizeIngredientKey(row.name)
              const missing = row.name.trim() && key && !ingredientsMap?.[key]
              return (
                <div key={row.rowId} className="ingredient-form-row">
                  <input
                    type="text"
                    placeholder="Nome ingrediente"
                    value={row.name}
                    onChange={(e) => updateRow(row.rowId, 'name', e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className="num-input"
                    placeholder="g"
                    value={row.grams}
                    onChange={(e) => updateRow(row.rowId, 'grams', e.target.value)}
                  />
                  <button type="button" className="icon-btn danger" onClick={() => removeRow(row.rowId)}>
                    ✕
                  </button>
                  {missing && (
                    <div className="missing-ingredient-note">
                      ⚠️ "{row.name}" non è nel database prezzi.
                      {creatingKey === key ? (
                        <span className="inline-create">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="num-input"
                            placeholder="€/kg"
                            value={priceDraft}
                            onChange={(e) => setPriceDraft(e.target.value)}
                            autoFocus
                          />
                          <button type="button" className="btn btn-small" onClick={() => confirmCreateIngredient(row.name)}>
                            Salva
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            setCreatingKey(key)
                            setPriceDraft('')
                          }}
                        >
                          Crea ora
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button type="button" className="btn btn-ghost" onClick={addRow}>
            + Aggiungi riga
          </button>

          <div className="totals-row">
            <span>
              Peso totale: <strong>{formatGrams(totals.totalWeight)} g</strong>
            </span>
            <span>
              Costo stimato: <strong>{formatCurrency(totals.totalCost)}</strong>
            </span>
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio…' : 'Salva ricetta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
