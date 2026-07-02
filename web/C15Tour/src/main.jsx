import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Point d'entrée de l'application React : on monte le composant App
// dans l'élément DOM #root (défini dans index.html).
// StrictMode active des vérifications supplémentaires en développement.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
