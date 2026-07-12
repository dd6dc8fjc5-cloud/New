import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Sottoscrizione in tempo reale alla collezione ingredienti.
// Ritorna sia l'elenco ordinato sia una mappa {key -> ingrediente} per i lookup di costo.
export function useIngredients() {
  const [ingredients, setIngredients] = useState([])
  const [ingredientsMap, setIngredientsMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'ingredients'), orderBy('name'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = []
      const map = {}
      snapshot.forEach((docSnap) => {
        const data = { key: docSnap.id, ...docSnap.data() }
        list.push(data)
        map[docSnap.id] = data
      })
      setIngredients(list)
      setIngredientsMap(map)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { ingredients, ingredientsMap, loading }
}
