import './css/carte.css'
import './css/leaflet.css';
import { MapContainer, TileLayer } from 'react-leaflet';
import HomeButton from './components/HomeButton';

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
        
        <>
        <HomeButton />
        <MapContainer
            center={[47.216671, -1.55]}
            zoom={13}
            style={{ height: '100vh', width: '100vw' }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        </MapContainer>
        </>

    );
}

export default Carte;