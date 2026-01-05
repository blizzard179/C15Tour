import { useEffect, useRef } from 'react';
import './css/carte.css'
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import leaflet from "leaflet"

function Carte() {

    // let mapRef = useRef();

    // useEffect(() => {
    //     mapRef = leaflet.map('map').setView([51.505, -0.09], 13);

    //     leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    //         maxZoom: 19,
    //         attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    //     }).addTo(mapRef.current);

    // }, []);

    // return <>
    //     <div id="map" ref={mapRef}></div>
    // </>
    return (
        <MapContainer
            center={[51.505, -0.09]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
        </MapContainer>
    );
}

export default Carte;