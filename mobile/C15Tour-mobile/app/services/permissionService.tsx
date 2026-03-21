import { Alert, Linking } from "react-native";
import * as Location from "expo-location";

export default async function checkLocationPermission() {
    try{
        const permission = await Location.getForegroundPermissionsAsync();

        if (permission.status === "granted") {
            return true;
        }
        
        if(!permission.canAskAgain){
            Alert.alert(
                "Permission bloquée",
                "La localisation doit être activée depuis les paramètres pour accéder à l'application",
                [
                    { text: "Annuler", style: "cancel"},
                    { text: "Paramètres", onPress: () => Linking.openSettings()}
                ]
            );
            return false;
        }

        // La permission n'est pas accordée et on peut demander à nouveau
        const newPermission = await Location.requestForegroundPermissionsAsync();
        
        if (newPermission.status === "granted") {
            return true;
        } else {
            // Permission refusée mais on peut redemander
            Alert.alert(
                "Permission refusée",
                "L'application a besoin de la localisation pour fonctionner",
                [
                    { text: "Annuler", style: "cancel" },
                    { text: "Réessayer", onPress: () => checkLocationPermission() }
                ]
            );
            return false;
        }
    }
    catch(error){
        console.error("Erreur lors de la vérification de la permission:", error);
        Alert.alert("Erreur", "Une erreur est survenue lors de la vérification de la permission.");
        return false;
    }
}

