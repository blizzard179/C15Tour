import { useMapEvents } from 'react-leaflet'

// Composant sans rendu visuel qui écoute les clics sur la carte Leaflet
// et transmet les coordonnées cliquées au composant parent.
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng)
    }
  })

  return null
}

export default ClickHandler
