import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import './css/accueil.css';
import damier from '@shared/global_assets/damier_accueil.svg';
import logoAccueil from '@shared/global_assets/logo_accueil.svg';
import carIcon from '@shared/global_assets/cars.svg';

function Home() {
    const navigate = useNavigate();
    const carRef = useRef(null);

    // Image de fond (damier)
    useEffect(() => {
        document.documentElement.style.setProperty('--damier', `url(${damier})`);
    }, []);

    // Redirection automatique après 5 secondes
    useEffect(() => {
        const redirectTimer = setTimeout(() => {
            navigate('/map');
        }, 5000);

        return () => clearTimeout(redirectTimer);
    }, [navigate]);

    // Animation de la voiture (aller de gauche à droite en boucle)
    useEffect(() => {
        const car = carRef.current;
        if (!car) return;

        // Position de départ
        car.style.transform = 'translateX(-100%) scaleX(-1)';

        // Premier passage
        setTimeout(() => {
            car.style.transition = 'transform 3s linear';
            car.style.transform = 'translateX(calc(100% + 50px)) scaleX(-1)';
        }, 100);

        // Boucle
        const interval = setInterval(() => {
            car.style.transition = 'none';
            car.style.transform = 'translateX(-100%) scaleX(-1)';

            setTimeout(() => {
                car.style.transition = 'transform 3s linear';
                car.style.transform = 'translateX(calc(100% + 50px)) scaleX(-1)';
            }, 50);
        }, 3200);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="background">
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '40px',
                    width: '100%',
                    padding: '20px',
                    boxSizing: 'border-box',
                }}
            >
                <img
                    src={logoAccueil}
                    className="logoAccueil"
                    alt="Logo C15Tour"
                />

                <div
                    className="car-container"
                    
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/map')}
                    style={{
                        backgroundColor: '#f0f0f0',
                        padding: '30px',
                        borderRadius: '10px',
                        textAlign: 'center',
                        width: '100%',
                        maxWidth: '400px',
                        boxSizing: 'border-box',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                
                    }}
                >
                    <div className="car-track">
                        <img
                            ref={carRef}
                            src={carIcon}
                            className="car"
                            alt="Animation de voiture"
                            style={{
                                width: '80px',
                                height: 'auto',
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                                display: 'block',
                                margin: '0 auto',
                            }}
                        />
                    </div>
                    <p
                        style={{
                            marginTop: '20px',
                            color: '#666',
                            fontFamily: 'sans-serif',
                            fontSize: '16px',
                            fontWeight: '500',
                        }}
                    >
                        Chargement ...
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Home;
