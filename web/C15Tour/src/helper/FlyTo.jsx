import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

// Composant sans rendu visuel qui centre automatiquement la carte (avec une
// animation) sur le dernier waypoint ajouté, dès que la liste de waypoints change.
function FlyTo({ waypoints }) {
  const map = useMap()

  useEffect(() => {
    if (!waypoints || waypoints.length === 0) return

    const lastPoint = waypoints[waypoints.length - 1]

    map.flyTo(lastPoint, map.getZoom(), {
      animate: true,
      duration: 0.5,
    })
  }, [waypoints, map])

  return null
}

export default FlyTo
