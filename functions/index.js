const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const Anthropic = require('@anthropic-ai/sdk')

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY')

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BASE64_LENGTH = 20 * 1024 * 1024 // ~20MB base64 (~15MB binary), well under the API limit

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome ingrediente, come scritto nella foto' },
          grams: { type: 'number', description: 'Quantità in grammi' },
        },
        required: ['name', 'grams'],
        additionalProperties: false,
      },
    },
  },
  required: ['ingredients'],
  additionalProperties: false,
}

const EXTRACTION_PROMPT = `Questa immagine mostra una ricetta di pasticceria, scritta a mano o stampata.
Estrai l'elenco degli ingredienti con le relative quantità in grammi.

Regole:
- Converti sempre le quantità in grammi (es. "1 kg" -> 1000, "1,5 kg" -> 1500). Se un'unità non è in peso (es. "1 uovo", "q.b.") e non è convertibile con certezza, ometti l'ingrediente.
- Ignora titoli, note, temperature di cottura o istruzioni che non sono ingredienti.
- Usa i nomi degli ingredienti così come appaiono nella foto, con la prima lettera maiuscola.
- Se un numero è ambiguo o illeggibile, fai la stima più ragionevole.
- Rispondi SOLO con il JSON richiesto, nessun altro testo.`

exports.extractRecipeFromImage = onCall(
  { secrets: [anthropicApiKey], region: 'europe-west1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Devi effettuare l\'accesso per usare questa funzione.')
    }

    const { imageBase64, mimeType } = request.data || {}

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new HttpsError('invalid-argument', 'Immagine mancante.')
    }
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
      throw new HttpsError('invalid-argument', 'Formato immagine non supportato. Usa JPEG, PNG, WEBP o GIF.')
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      throw new HttpsError('invalid-argument', 'Immagine troppo grande. Usa una foto più piccola.')
    }

    const client = new Anthropic({ apiKey: anthropicApiKey.value() })

    let response
    try {
      response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        output_config: { format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
              { type: 'text', text: EXTRACTION_PROMPT },
            ],
          },
        ],
      })
    } catch (err) {
      console.error('Anthropic API error', err)
      throw new HttpsError('internal', 'Errore durante l\'analisi della foto. Riprova.')
    }

    if (response.stop_reason === 'refusal') {
      throw new HttpsError('invalid-argument', 'Impossibile analizzare questa immagine. Prova con una foto diversa.')
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock) {
      throw new HttpsError('internal', 'Risposta inattesa dal modello.')
    }

    let parsed
    try {
      parsed = JSON.parse(textBlock.text)
    } catch (err) {
      console.error('JSON parse error', textBlock.text)
      throw new HttpsError('internal', 'Impossibile interpretare la risposta del modello.')
    }

    const ingredients = Array.isArray(parsed.ingredients)
      ? parsed.ingredients
          .map((i) => ({ name: String(i.name || '').trim(), grams: Number(i.grams) || 0 }))
          .filter((i) => i.name && i.grams > 0)
      : []

    return { ingredients }
  },
)
