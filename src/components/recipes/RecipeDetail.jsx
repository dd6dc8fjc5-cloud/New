import { useState } from 'react'
import { computeRecipeTotals, formatGrams, formatCurrency, formatPricePerKg, normalizeIngredientKey } from '../../lib/calculations'
import { upsertIngredient, deleteRecipe } from '../../lib/firestoreApi'
import ScaleDough from './ScaleDough'

export default function RecipeDetail({ recipe, ingredientsMap, onBack, onEdit }) {
  const [creatingKey, setCreatingKey] = useState(null)
  const [priceDraft, setPriceDraft] = useState('')
  const [deleting, setDeleting] = useState(false)

  const totals = computeRecipeTotals(recipe.ingredients, ingredientsMap)

  async function confirmCreateIngredient(name) {
    const price = parseFloat(priceDraft.replace(',', '.'))
    if (Number.isNaN(price) || price < 0) return
    await upsertIngredient(name, price)
    setCreatingKey(null)
    setPriceDraft('')
  }

  async function handleDelete() {
    if (!confirm(`Eliminare definitivamente la ricetta "${recipe.name}"?`)) return
    setDeleting(true)
    try {
      await deleteRecipe(recipe.id)
      onBack()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page">
      <button className="link-btn back-link" onClick={onBack}>
        ← Tutte le ricette
      </button>
      <div className="recipe-detail-header">
        <h2>{recipe.name}</h2>
        <div className="recipe-detail-actions">
          <button className="btn btn-ghost" onClick={() => onEdit(recipe)}>
            Modifica
          </button>
          <button className="btn btn-ghost danger" onClick={handleDelete} disabled={deleting}>
            Elimina
          </button>
        </div>
      </div>

      <table className="ingredient-table">
        <thead>
          <tr>
            <th>Ingrediente</th>
            <th className="num-col">Grammi</th>
            <th className="num-col">€/kg</th>
            <th className="num-col">Costo</th>
          </tr>
        </thead>
        <tbody>
          {recipe.ingredients.map((ing, i) => {
            const key = ing.ingredientKey || normalizeIngredientKey(ing.name)
            const dbIng = ingredientsMap?.[key]
            const cost = dbIng ? (Number(ing.grams) / 1000) * Number(dbIng.pricePerKg || 0) : null
            return (
              <tr key={i}>
                <td>
                  {ing.name}
                  {!dbIng && (
                    <div className="missing-ingredient-note">
                      ⚠️ Prezzo non impostato.
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
                          <button className="btn btn-small" onClick={() => confirmCreateIngredient(ing.name)}>
                            Salva
                          </button>
                        </span>
                      ) : (
                        <button
                          className="link-btn"
                          onClick={() => {
                            setCreatingKey(key)
                            setPriceDraft('')
                          }}
                        >
                          Imposta prezzo
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="num-col">{formatGrams(ing.grams)}</td>
                <td className="num-col">{dbIng ? formatPricePerKg(dbIng.pricePerKg) : '—'}</td>
                <td className="num-col">{cost != null ? formatCurrency(cost) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="totals-row totals-row-large">
        <span>
          Peso totale: <strong>{formatGrams(totals.totalWeight)} g</strong>
        </span>
        <span>
          Costo totale: <strong>{formatCurrency(totals.totalCost)}</strong>
        </span>
      </div>

      <ScaleDough recipe={recipe} ingredientsMap={ingredientsMap} />
    </div>
  )
}
