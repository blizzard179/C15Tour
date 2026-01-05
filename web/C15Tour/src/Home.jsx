import { useNavigate } from 'react-router-dom';
import './css/accueil.css'
import logoAccueil from '/src/assets/logo_accueil.svg'

function Home() {

    const navigate = useNavigate();

    return <>
        <div className="background">
            <img src={logoAccueil} className="logoAccueil" />
            <button onClick={() => navigate('/map')} className="authButton"><strong>AUTHENTIFICATION</strong></button>
        </div>
    </>
}
export default Home;