import './css/carte.css'
import './css/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useState } from 'react';
import RoutingMachine from './helper/RoutingMachine';
import ClickHandler from './helper/ClickHandler';
import FlyTo from './helper/FlyTo';
import ConvoyCard from './components/CardConvoi';
import Pin from '@shared/global_assets/pictos/Pin 2.svg'
import ResearchBar from './components/ResearchBar';

function Carte() {

    const [waypoints, setWaypoints] = useState([])

    const pinIcon = L.icon({
        iconUrl: Pin,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -28]
    });

    return (
        <div className="map-container">
            <MapContainer
                center={[47.216671, -1.55]}
                zoom={13}
                style={{ height: '100vh', width: '100%' }}
            >
                {/* <button onClick={() => setWaypoints([])}>
                    Réinitialiser
                </button>
                <button onClick={() =>
                    setWaypoints(prev => prev.slice(0, -1))
                }>
                    Annuler dernier point
                </button> */}

                /* Tuile openstreetmap */
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap/>'
                />
                /* Gestion des clics sur la carte */
                <ClickHandler setWaypoints={setWaypoints} />
                {waypoints.map((point, index) => (
                    <Marker key={index} position={point} icon={pinIcon}>
                        <Popup>Point {index + 1}</Popup>
                    </Marker>
                ))}

                /* Gestion du routage */
                {waypoints.length >= 2 && <RoutingMachine waypoints={waypoints} />}

                /* Centrage automatique de la carte */
                <FlyTo position={waypoints} />

            </MapContainer>
            <div className="overlay-container">
                <ResearchBar />
                <ConvoyCard />
            </div>
        </div>

    );
}

export default Carte;