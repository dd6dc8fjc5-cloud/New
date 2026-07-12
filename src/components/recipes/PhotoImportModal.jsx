import { useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase'
import RecipeForm from './RecipeForm'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const base64 = result.substring(result.indexOf(',') + 1)
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PhotoImportModal({ ingredientsMap, onSaved, onCancel }) {
  const [step, setStep] = useState('upload')
  const [preview, setPreview] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    try {
      const base64 = await fileToBase64(file)
      const extractRecipeFromImage = httpsCallable(functions, 'extractRecipeFromImage')
      const result = await extractRecipeFromImage({
        imageBase64: base64,
        mimeType: file.type || 'image/jpeg',
      })
      const ingredients = result.data?.ingredients || []
      if (ingredients.length === 0) {
        setError('Non è stato possibile leggere ingredienti dalla foto. Prova con una foto più nitida.')
        return
      }
      setParsedRows(ingredients.map((i) => ({ name: String(i.name || '').trim(), grams: Number(i.grams) || 0 })))
      setStep('confirm')
    } catch (err) {
      console.error(err)
      setError('Errore durante l\'analisi della foto. Riprova o inserisci la ricetta manualmente.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'confirm') {
    return (
      <RecipeForm
        title="Conferma ricetta letta dalla foto"
        initialName=""
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
        <h2>Importa ricetta da foto</h2>
        <p className="muted">
          Carica una foto della ricetta scritta a mano o stampata. L'intelligenza artificiale estrarrà
          automaticamente ingredienti e grammature.
        </p>
        <input type="file" accept="image/*" capture="environment" onChange={handleFile} disabled={loading} />
        {preview && <img src={preview} alt="anteprima" className="photo-preview" />}
        {loading && <p className="muted">🔍 Analisi della foto in corso…</p>}
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
