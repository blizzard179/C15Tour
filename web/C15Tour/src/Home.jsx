import { useNavigate } from 'react-router-dom';
import './css/accueil.css';
import damier from '@shared/global_assets/damier_accueil.svg'
import logoAccueil from '@shared/global_assets/logo_accueil.svg';

function Home() {
    document.documentElement.style.setProperty(
        '--damier',
        `url(${damier})`
    )

    const navigate = useNavigate();

    return <>
        <div className="background">
            <img src={logoAccueil} className="logoAccueil" />
            <button onClick={() => navigate('/map')} className="authButton"><strong>AUTHENTIFICATION</strong></button>
        </div>
    </>
}
export default Home;