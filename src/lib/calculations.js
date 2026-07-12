// Normalizza il nome di un ingrediente in una chiave stabile, usata come id
// documento in Firestore così la ricerca "esiste già?" è un lookup diretto.
export function normalizeIngredientKey(name) {
  return (name || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // rimuove accenti
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

// Calcola peso totale, costo totale e ingredienti mancanti dal database prezzi.
export function computeRecipeTotals(ingredients, ingredientsMap) {
  let totalWeight = 0
  let totalCost = 0
  const missing = []

  for (const ing of ingredients || []) {
    const grams = Number(ing.grams) || 0
    totalWeight += grams

    const key = ing.ingredientKey || normalizeIngredientKey(ing.name)
    const dbIngredient = ingredientsMap?.[key]
    if (!dbIngredient) {
      if (ing.name && !missing.includes(ing.name)) missing.push(ing.name)
      continue
    }
    const pricePerKg = Number(dbIngredient.pricePerKg) || 0
    totalCost += (grams / 1000) * pricePerKg
  }

  return { totalWeight, totalCost, missing }
}

// Scala tutti gli ingredienti di una ricetta a un nuovo peso totale,
// mantenendo le proporzioni originali.
export function scaleIngredients(ingredients, targetTotalWeight) {
  const currentTotal = (ingredients || []).reduce((sum, ing) => sum + (Number(ing.grams) || 0), 0)
  if (!currentTotal || !targetTotalWeight) {
    return (ingredients || []).map((ing) => ({ ...ing }))
  }
  const factor = Number(targetTotalWeight) / currentTotal
  return ingredients.map((ing) => ({
    ...ing,
    grams: roundGrams((Number(ing.grams) || 0) * factor),
  }))
}

export function roundGrams(value) {
  return Math.round(value * 10) / 10
}

export function formatGrams(value) {
  const n = Number(value) || 0
  return n.toLocaleString('it-IT', { maximumFractionDigits: 1, minimumFractionDigits: 0 })
}

export function formatCurrency(value) {
  const n = Number(value) || 0
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function formatPricePerKg(value) {
  const n = Number(value) || 0
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}
