import * as Location from 'expo-location';
import { Alert } from 'react-native';

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


let subscription: Location.LocationSubscription | null = null;
let locationCallback: ((latitude: number, longitude: number) => void) | null = null;

export async function startTracking(onLocationUpdate?: (latitude: number, longitude: number) => void) {
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
            console.log('📍 Nouvelle position:', lat.toFixed(6), lon.toFixed(6), 'Précision:', location.coords.accuracy?.toFixed(0), 'm');
            
            if (locationCallback) {
                locationCallback(lat, lon);
            }
        }
    );
}

export function stopTracking() {
    subscription?.remove();
    subscription = null;
    locationCallback = null;
    console.log('🛑 Suivi de localisation arrêté');
}
