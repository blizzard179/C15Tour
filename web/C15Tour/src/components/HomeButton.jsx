import React from 'react';

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