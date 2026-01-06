import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

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
