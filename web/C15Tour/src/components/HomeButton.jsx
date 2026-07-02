import React from 'react';

// Bouton de retour à l'écran d'accueil (rechargement complet de la page vers "/")
const HomeButton = () => {
    const handleClick = () => {
        window.location.href = '/';
    };

    return (
        <button 
            onClick={handleClick}
            className="buttonHome"
        >
            <img src="../../Global assets/picto/boutton_home.svg" alt="Home" />
        </button>
    );
};

export default HomeButton;