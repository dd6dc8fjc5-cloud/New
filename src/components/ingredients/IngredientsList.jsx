import { useState } from 'react'
import { useIngredients } from '../../hooks/useIngredients'
import { upsertIngredient, updateIngredientPrice, deleteIngredient } from '../../lib/firestoreApi'
import { formatPricePerKg } from '../../lib/calculations'

export default function IngredientsList() {
  const { ingredients, loading } = useIngredients()
  const [filter, setFilter] = useState('')
  const [editingKey, setEditingKey] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [busy, setBusy] = useState(false)

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(filter.trim().toLowerCase()),
  )

  function startEdit(ing) {
    setEditingKey(ing.key)
    setEditValue(String(ing.pricePerKg ?? ''))
  }

  async function saveEdit(key) {
    const value = parseFloat(editValue.replace(',', '.'))
    if (Number.isNaN(value) || value < 0) {
      setEditingKey(null)
      return
    }
    await updateIngredientPrice(key, value)
    setEditingKey(null)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const price = parseFloat(newPrice.replace(',', '.')) || 0
    setBusy(true)
    try {
      await upsertIngredient(newName, price)
      setNewName('')
      setNewPrice('')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(ing) {
    if (!confirm(`Eliminare l'ingrediente "${ing.name}"? Le ricette che lo usano segnaleranno il prezzo mancante.`)) return
    await deleteIngredient(ing.key)
  }

  return (
    <div className="page">
      <h2>Ingredienti e prezzi</h2>

      <form className="add-ingredient-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Nuovo ingrediente"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="€/kg"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          className="num-input"
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Aggiungi
        </button>
      </form>

      <input
        type="text"
        className="filter-input"
        placeholder="🔍 Cerca ingrediente…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {loading ? (
        <p className="muted">Caricamento…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">Nessun ingrediente trovato.</p>
      ) : (
        <ul className="ingredient-list">
          {filtered.map((ing) => (
            <li key={ing.key} className="ingredient-row">
              <span className="ingredient-name">{ing.name}</span>
              {editingKey === ing.key ? (
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  className="num-input price-edit"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => saveEdit(ing.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(ing.key)
                    if (e.key === 'Escape') setEditingKey(null)
                  }}
                />
              ) : (
                <button className="price-tag" onClick={() => startEdit(ing)}>
                  {formatPricePerKg(ing.pricePerKg)} €/kg
                </button>
              )}
              <button className="icon-btn danger" onClick={() => handleDelete(ing)} title="Elimina">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
