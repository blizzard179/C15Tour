import './css/accueil.css'
import logoAccueil from '/logo_accueil.svg'

const AUTHENTIFICATION = "AUTHENTIFICATION"

function App() {
  return <>
    <div className="background">
      <img src={logoAccueil} className="logoAccueil" />
      <button className="authButton"><strong>{AUTHENTIFICATION}</strong></button>
    </div>
  </>
}

export default App
