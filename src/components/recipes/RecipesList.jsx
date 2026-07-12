import { useState } from 'react'
import { useRecipes } from '../../hooks/useRecipes'
import { useIngredients } from '../../hooks/useIngredients'
import { computeRecipeTotals, formatGrams, formatCurrency } from '../../lib/calculations'
import RecipeForm from './RecipeForm'
import RecipeDetail from './RecipeDetail'
import ExcelImportModal from './ExcelImportModal'
import PhotoImportModal from './PhotoImportModal'

export default function RecipesList() {
  const { recipes, loading } = useRecipes()
  const { ingredientsMap } = useIngredients()
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal] = useState(null) // 'menu' | 'manual' | 'excel' | 'photo' | 'edit'
  const [editingRecipe, setEditingRecipe] = useState(null)

  const selectedRecipe = recipes.find((r) => r.id === selectedId)
  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(filter.trim().toLowerCase()))

  function closeModal() {
    setModal(null)
    setEditingRecipe(null)
  }

  function openEdit(recipe) {
    setEditingRecipe(recipe)
    setModal('edit')
  }

  if (selectedRecipe && !modal) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        ingredientsMap={ingredientsMap}
        onBack={() => setSelectedId(null)}
        onEdit={openEdit}
      />
    )
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2>Ricette</h2>
        <div className="new-recipe-menu">
          <button className="btn btn-primary" onClick={() => setModal(modal === 'menu' ? null : 'menu')}>
            + Nuova ricetta
          </button>
          {modal === 'menu' && (
            <div className="dropdown-menu">
              <button onClick={() => setModal('manual')}>✍️ Manuale</button>
              <button onClick={() => setModal('excel')}>📊 Da Excel</button>
              <button onClick={() => setModal('photo')}>📷 Da foto</button>
            </div>
          )}
        </div>
      </div>

      <input
        type="text"
        className="filter-input"
        placeholder="🔍 Cerca ricetta…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {loading ? (
        <p className="muted">Caricamento…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">Nessuna ricetta trovata. Creane una nuova!</p>
      ) : (
        <ul className="recipe-cards">
          {filtered.map((recipe) => {
            const totals = computeRecipeTotals(recipe.ingredients, ingredientsMap)
            return (
              <li key={recipe.id} className="recipe-card" onClick={() => setSelectedId(recipe.id)}>
                <div className="recipe-card-name">{recipe.name}</div>
                <div className="recipe-card-meta">
                  <span>{formatGrams(totals.totalWeight)} g</span>
                  <span>{formatCurrency(totals.totalCost)}</span>
                  {totals.missing.length > 0 && <span className="warning-badge">⚠️ prezzi mancanti</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {modal === 'manual' && (
        <RecipeForm
          title="Nuova ricetta manuale"
          ingredientsMap={ingredientsMap}
          onSaved={closeModal}
          onCancel={closeModal}
        />
      )}
      {modal === 'excel' && (
        <ExcelImportModal ingredientsMap={ingredientsMap} onSaved={closeModal} onCancel={closeModal} />
      )}
      {modal === 'photo' && (
        <PhotoImportModal ingredientsMap={ingredientsMap} onSaved={closeModal} onCancel={closeModal} />
      )}
      {modal === 'edit' && editingRecipe && (
        <RecipeForm
          title="Modifica ricetta"
          recipeId={editingRecipe.id}
          initialName={editingRecipe.name}
          initialIngredients={editingRecipe.ingredients}
          ingredientsMap={ingredientsMap}
          onSaved={closeModal}
          onCancel={closeModal}
        />
      )}
    </div>
  )
}
