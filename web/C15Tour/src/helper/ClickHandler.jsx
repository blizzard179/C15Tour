import { useMapEvents } from 'react-leaflet'

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng)
    }
  })

  return null
}

export default ClickHandler
