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

        // Obtenir la position actuelle avec options
        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 1000,
            mayShowUserSettingsDialog: true,
        });
        
        console.log('✅ Localisation obtenue:', location.coords.latitude.toFixed(6), location.coords.longitude.toFixed(6));
        Alert.alert(
            'Localisation obtenue',
            `Latitude: ${location.coords.latitude.toFixed(6)}\nLongitude: ${location.coords.longitude.toFixed(6)}`
        );
        return location;
    } catch (error) {
        console.error("❌ Erreur lors de l'obtention de la localisation:", error);
        throw error;
    }
}


let subscription: Location.LocationSubscription | null = null;

export async function startTracking() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert(
            'Autorisation refusée',
            'Cette application a besoin de votre permission pour accéder à votre localisation'
        );
        throw new Error('Permission de localisation refusée');
    }

    let subscription = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
        },
        (location) => {
            console.log('📍 Nouvelle position:', location.coords.latitude.toFixed(6), location.coords.longitude.toFixed(6));
        }
    );
}

export function stopTracking() {
    subscription?.remove();
    subscription = null;
    console.log('🛑 Suivi de localisation arrêté');
}
