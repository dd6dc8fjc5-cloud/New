import { useState } from 'react'
import { scaleIngredients, computeRecipeTotals, formatGrams, formatCurrency } from '../../lib/calculations'
import { createRecipe } from '../../lib/firestoreApi'

export default function ScaleDough({ recipe, ingredientsMap }) {
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const targetNum = parseFloat(String(target).replace(',', '.'))
  const scaled =
    targetNum > 0 ? scaleIngredients(recipe.ingredients, targetNum) : null
  const scaledTotals = scaled ? computeRecipeTotals(scaled, ingredientsMap) : null

  async function saveAsNewRecipe() {
    if (!scaled) return
    setSaving(true)
    try {
      await createRecipe({
        name: `${recipe.name} (scalata a ${formatGrams(targetNum)} g)`,
        ingredients: scaled,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="scale-box">
      <h3>⚖️ Scala impasto</h3>
      <label className="scale-input-row">
        Peso totale target (g)
        <input
          type="text"
          inputMode="decimal"
          className="num-input"
          placeholder="es. 90000"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </label>

      {scaled && (
        <>
          <table className="ingredient-table">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th className="num-col">Grammi</th>
              </tr>
            </thead>
            <tbody>
              {scaled.map((ing, i) => (
                <tr key={i}>
                  <td>{ing.name}</td>
                  <td className="num-col">{formatGrams(ing.grams)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="totals-row">
            <span>
              Peso totale: <strong>{formatGrams(scaledTotals.totalWeight)} g</strong>
            </span>
            <span>
              Costo stimato: <strong>{formatCurrency(scaledTotals.totalCost)}</strong>
            </span>
          </div>
          {scaledTotals.missing.length > 0 && (
            <p className="warning-text">
              ⚠️ Prezzo mancante per: {scaledTotals.missing.join(', ')}
            </p>
          )}
          <button className="btn btn-secondary" onClick={saveAsNewRecipe} disabled={saving}>
            {saved ? '✓ Salvata come nuova ricetta' : saving ? 'Salvataggio…' : 'Salva come nuova ricetta scalata'}
          </button>
        </>
      )}
    </div>
  )
}
