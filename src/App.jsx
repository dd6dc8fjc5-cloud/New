import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import RecipesList from './components/recipes/RecipesList'
import IngredientsList from './components/ingredients/IngredientsList'
import InvoiceImport from './components/invoices/InvoiceImport'
import LievitoMadreCalculator from './components/sourdough/LievitoMadreCalculator'

const TABS = [
  { id: 'recipes', label: 'Ricette', icon: '📖' },
  { id: 'ingredients', label: 'Ingredienti', icon: '🧂' },
  { id: 'sourdough', label: 'Lievito madre', icon: '🫙' },
  { id: 'invoices', label: 'Fatture', icon: '🧾' },
]

export default function App() {
  const { user, loading, logout } = useAuth()
  const [tab, setTab] = useState('recipes')

  if (loading) {
    return <div className="full-screen-center">Caricamento…</div>
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">🥐 Ricettario</span>
        <button className="link-btn" onClick={logout}>
          Esci
        </button>
      </header>

      <main className="app-main">
        {tab === 'recipes' && <RecipesList />}
        {tab === 'ingredients' && <IngredientsList />}
        {tab === 'sourdough' && <LievitoMadreCalculator />}
        {tab === 'invoices' && <InvoiceImport />}
      </main>

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`bottom-nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="bottom-nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
