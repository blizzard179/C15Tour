import './css/carte.css'
import './css/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useLayoutEffect, useRef, useState } from 'react';
import RoutingMachine from './helper/RoutingMachine';
import ClickHandler from './helper/ClickHandler';
import FlyTo from './helper/FlyTo';
import ConvoyCard from './components/CardConvoi';
import Pin from '@shared/global_assets/pictos/Pin 2.svg'
import ResearchBar from './components/ResearchBar';
import RoadsTour from './components/RoadsTour';

function Carte() {

    const [waypoints, setWaypoints] = useState([])
    const [isConvoyBelowSearch, setIsConvoyBelowSearch] = useState(false);
    const leftPanelRef = useRef(null);
    const searchLayerRef = useRef(null);

    const pinIcon = L.icon({
        iconUrl: Pin,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -28]
    });

    useLayoutEffect(() => {
        const updateOverlayLayout = () => {
            const leftPanel = leftPanelRef.current;
            const searchLayer = searchLayerRef.current;
            if (!leftPanel || !searchLayer) return;

            const leftRect = leftPanel.getBoundingClientRect();
            const searchRect = searchLayer.getBoundingClientRect();

            const safetyGap = 40;
            const mustStack = leftRect.right + safetyGap >= searchRect.left;
            setIsConvoyBelowSearch((prev) => (prev === mustStack ? prev : mustStack));
        };

        updateOverlayLayout();
        const observer = new ResizeObserver(updateOverlayLayout);

        if (leftPanelRef.current) observer.observe(leftPanelRef.current);
        if (searchLayerRef.current) observer.observe(searchLayerRef.current);
        window.addEventListener('resize', updateOverlayLayout);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateOverlayLayout);
        };
    }, []);

    return (
        <div className="map-container">
            <MapContainer
                center={[47.216671, -1.55]}
                zoom={13}
                style={{ height: '100vh', width: '100%' }}
            >

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
                <div className="search-bar-layer" ref={searchLayerRef}>
                    <ResearchBar />
                </div>
                <div
                    className={`left-panel ${isConvoyBelowSearch ? 'left-panel-below' : ''}`}
                    ref={leftPanelRef}
                >
                    <ConvoyCard />
                </div>
                <RoadsTour />
            </div>
        </div>

    );
}

export default Carte;
