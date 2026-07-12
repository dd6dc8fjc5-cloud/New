import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { normalizeIngredientKey } from './calculations'

const ingredientsCol = collection(db, 'ingredients')
const recipesCol = collection(db, 'recipes')

// ---------- Ingredienti ----------

export async function upsertIngredient(name, pricePerKg) {
  const key = normalizeIngredientKey(name)
  if (!key) throw new Error('Nome ingrediente non valido')
  const ref = doc(ingredientsCol, key)
  await setDoc(
    ref,
    {
      name: name.trim(),
      pricePerKg: Number(pricePerKg) || 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  return key
}

export async function updateIngredientPrice(key, pricePerKg) {
  const ref = doc(ingredientsCol, key)
  await updateDoc(ref, {
    pricePerKg: Number(pricePerKg) || 0,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteIngredient(key) {
  await deleteDoc(doc(ingredientsCol, key))
}

// Upsert in batch per l'importazione fattura: righe = [{name, pricePerKg}]
export async function upsertIngredientsBatch(rows) {
  const batch = writeBatch(db)
  const created = []
  const updated = []
  for (const row of rows) {
    const key = normalizeIngredientKey(row.name)
    if (!key) continue
    const ref = doc(ingredientsCol, key)
    batch.set(
      ref,
      {
        name: row.name.trim(),
        pricePerKg: Number(row.pricePerKg) || 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    if (row.existed) updated.push(row)
    else created.push(row)
  }
  await batch.commit()
  return { created, updated }
}

// ---------- Ricette ----------

export async function createRecipe({ name, ingredients }) {
  const ref = await addDoc(recipesCol, {
    name: name.trim(),
    ingredients: ingredients.map((ing) => ({
      name: ing.name.trim(),
      ingredientKey: normalizeIngredientKey(ing.name),
      grams: Number(ing.grams) || 0,
    })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateRecipe(id, { name, ingredients }) {
  const ref = doc(recipesCol, id)
  await updateDoc(ref, {
    name: name.trim(),
    ingredients: ingredients.map((ing) => ({
      name: ing.name.trim(),
      ingredientKey: normalizeIngredientKey(ing.name),
      grams: Number(ing.grams) || 0,
    })),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRecipe(id) {
  await deleteDoc(doc(recipesCol, id))
}
