import * as Location from 'expo-location';
import { Alert } from 'react-native';

// Récupère une position GPS ponctuelle (haute précision), après avoir vérifié
// que les services de localisation sont activés et la permission accordée.
export async function getLocation() {
    try {
        // Vérifier si les services de localisation sont activés
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
            Alert.alert(
                'Services de localisation désactivés',
                'Veuillez activer la localisation dans les paramètres de votre téléphone'
            );
            throw new Error('Les services de localisation sont désactivés');
        }

        // Demander les permissions de localisation
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Autorisation refusée',
                'Cette application a besoin de votre permission pour accéder à votre localisation'
            );
            throw new Error('Permission de localisation refusée');
        }

        // Obtenir la position actuelle avec options (Haute Précision)
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
            timeInterval: 1500,
            mayShowUserSettingsDialog: true,
        });
        
        console.log('✅ Localisation obtenue:', location.coords.latitude.toFixed(6), location.coords.longitude.toFixed(6));
        console.log('📍 Précision:', location.coords.accuracy, 'mètres');
        
        return location;
    } catch (error) {
        console.error("❌ Erreur lors de l'obtention de la localisation:", error);
        throw error;
    }
}


// État module-level (et non dans un composant) car ce service est utilisé comme
// un singleton partagé par toute l'application, appelé en dehors de tout cycle de vie React
let subscription: Location.LocationSubscription | null = null;
let headingSubscription: Location.LocationSubscription | null = null;
let locationCallback: ((latitude: number, longitude: number, heading?: number | null) => void) | null = null;

// Démarre un suivi GPS continu (mise à jour tous les 5m ou 5s) et notifie le
// callback fourni à chaque nouvelle position
export async function startTracking(onLocationUpdate?: (latitude: number, longitude: number, heading?: number | null) => void) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Autorisation refusée',
            'Cette application a besoin de votre permission pour accéder à votre localisation'
        );
        throw new Error('Permission de localisation refusée');
    }

    locationCallback = onLocationUpdate || null;

    subscription = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.Highest,
            distanceInterval: 5,
            timeInterval: 5000,
        },
        (location) => {
            const lat = location.coords.latitude;
            const lon = location.coords.longitude;
            const heading = location.coords.heading;
            console.log('📍 Nouvelle position:', lat.toFixed(6), lon.toFixed(6), 'Précision:', location.coords.accuracy?.toFixed(0), 'm');
            
            if (locationCallback) {
                locationCallback(lat, lon, heading);
            }
        }
    );
}

// Démarre le suivi du cap (boussole), utilisé uniquement pour orienter l'icône
// du véhicule de tête envoyée en télémétrie (voir explore.tsx, rôle "leader")
export async function startHeadingTracking(onHeadingUpdate?: (heading?: number | null) => void) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Autorisation refusée',
            'Cette application a besoin de votre permission pour accéder à votre localisation'
        );
        throw new Error('Permission de localisation refusée');
    }

    headingSubscription = await Location.watchHeadingAsync((headingData) => {
        // Préfère le cap "vrai" (géographique) au cap magnétique, quand il est disponible
        const heading = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
        onHeadingUpdate?.(Number.isFinite(heading) && heading >= 0 ? heading : null);
    });
}

// Arrête tous les suivis GPS/boussole en cours (à appeler au démontage de l'écran carte)
export function stopTracking() {
    subscription?.remove();
    headingSubscription?.remove();
    subscription = null;
    headingSubscription = null;
    locationCallback = null;
    console.log('🛑 Suivi de localisation arrêté');
}

export default {
    getLocation,
    startTracking,
    stopTracking
};
