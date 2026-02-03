import { useMapEvents } from 'react-leaflet'

function ClickHandler({ setWaypoints }) {
  useMapEvents({
    click(e) {
      setWaypoints(prev => [...prev, e.latlng])
    }
  })

  return null
}

export default ClickHandler
