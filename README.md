# 🥐 Ricettario

Web app per un laboratorio di pasticceria professionale: ricette, costi, scalatura impasti e
gestione fatture fornitore, con backend condiviso in tempo reale su Firebase (Authentication +
Firestore). Un solo login, dati sempre sincronizzati tra telefono, tablet e PC.

## Stack

- **React + Vite** (frontend)
- **Firebase Authentication** (email + password)
- **Firebase Firestore** (dati condivisi, sincronizzati in tempo reale con `onSnapshot`)
- **Firebase Cloud Functions** (estrazione ricette da foto con Claude, chiave API tenuta lato server)
- **SheetJS (xlsx)** per l'importazione di Excel (ricette e fatture)
- **Firebase Hosting** per il deploy pubblico

## 1. Crea il progetto Firebase

1. Vai su [console.firebase.google.com](https://console.firebase.google.com) e crea un nuovo progetto.
2. **Authentication** → Sign-in method → abilita **Email/Password**.
3. **Authentication** → Users → crea l'unico account del laboratorio (es. `laboratorio@tuodominio.it`).
   Tutti useranno queste stesse credenziali su ogni dispositivo.
4. **Firestore Database** → crea database (modalità produzione, scegli la regione, es. `europe-west1`).
5. **Impostazioni progetto** → Le tue app → aggiungi una **Web app** → copia la configurazione SDK.

## 2. Configura il frontend

```bash
npm install
cp .env.example .env
# incolla i valori copiati dalla console Firebase in .env
```

## 3. Avvia in locale

```bash
npm run dev
```

## 4. Configura le Cloud Functions (import ricette da foto)

La funzione `extractRecipeFromImage` chiama l'API di Anthropic (Claude) lato server, così la chiave
API non è mai esposta al browser.

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc
# modifica .firebaserc con il tuo project id Firebase

cd functions
npm install
cd ..

# Salva la chiave Anthropic come secret (richiesto: piano Blaze, pay-as-you-go)
firebase functions:secrets:set ANTHROPIC_API_KEY
```

> Le Cloud Functions richiedono il piano **Blaze** (pay-as-you-go) di Firebase — ha comunque una
> generosa quota gratuita mensile.

## 5. Regole di sicurezza Firestore

Il repo include `firestore.rules`: chiunque abbia effettuato l'accesso con le credenziali del
laboratorio può leggere e scrivere tutti i dati (un solo account condiviso, come richiesto).

## 6. Deploy

```bash
npm run build
firebase deploy
```

Questo pubblica hosting, regole Firestore e Cloud Functions. Il link pubblico generato (tipo
`https://<project-id>.web.app`) funziona da qualsiasi telefono, tablet o PC, senza installare nulla.

Per pubblicare solo l'hosting dopo una modifica al frontend:

```bash
npm run build
firebase deploy --only hosting
```

## Struttura dati Firestore

- `ingredients/{chiaveNormalizzata}` — `{ name, pricePerKg, updatedAt }`
- `recipes/{id}` — `{ name, ingredients: [{ name, ingredientKey, grams }], createdAt, updatedAt }`

Il peso e il costo totale di ogni ricetta **non sono salvati**: si calcolano al volo nel client
incrociando `recipe.ingredients` con `ingredients`, così quando cambia un prezzo tutte le ricette
che lo usano si aggiornano istantaneamente su ogni dispositivo connesso.

## Funzionalità

- **Ricette**: elenco, inserimento manuale riga per riga, import da Excel (colonne
  `ingrediente`/`grammi`), import da foto (AI vision), calcolo automatico di peso e costo totale.
- **Scala impasto**: inserendo un peso target l'app ricalcola grammi e costo mantenendo le
  proporzioni; puoi salvare il risultato come nuova ricetta scalata.
- **Ingredienti**: elenco con prezzo al kg modificabile in qualsiasi momento; il costo di ogni
  ricetta si aggiorna automaticamente.
- **Fatture**: import Excel fornitore (`articolo` + `prezzo_kg`, oppure `articolo` + `quantità` +
  `prezzo`), calcolo del prezzo al kg, creazione/aggiornamento automatico degli ingredienti, con
  riepilogo di cosa è cambiato.
- Ingredienti mancanti dal database prezzi vengono sempre segnalati con un avviso e un pulsante per
  crearli al volo.
