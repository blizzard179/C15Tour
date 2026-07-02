import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'

// Composant alternatif de calcul d'itinéraire basé sur le plugin Leaflet Routing
// Machine (via l'API publique OSRM). Non utilisé par Carte.jsx, qui implémente son
// propre calcul de routage (RoutingControl) avec support Valhalla + repli OSRM.
function RoutingMachine({ waypoints }) {
  const map = useMap()

  useEffect(() => {
    if (!waypoints || waypoints.length < 2) return

    const routingControl = L.Routing.control({
      waypoints: waypoints.map(p => L.latLng(p.lat, p.lng)),
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
      }),
      addWaypoints: false,
      draggableWaypoints: false,
      show: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: 'blue', weight: 5 }]
      }
    }).addTo(map)

    return () => {
      map.removeControl(routingControl)
    }
  }, [waypoints, map])

  return null
}

export default RoutingMachine
