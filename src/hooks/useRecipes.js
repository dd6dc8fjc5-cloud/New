import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Sottoscrizione in tempo reale alla collezione ricette.
export function useRecipes() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'recipes'), orderBy('name'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecipes(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { recipes, loading }
}
