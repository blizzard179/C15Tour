import * as Audio from "expo-audio";
import { Alert, Linking } from "react-native";

export default async function checkAudioPermission() {
    try {
        const permission = await Audio.getRecordingPermissionsAsync();

        if (permission.status === "granted") {
            console.log("✅ Permission microphone déjà accordée");
            return true;
        }

        if (!permission.canAskAgain) {
            Alert.alert(
                "Permission bloquée",
                "L'accès au microphone doit être activé depuis les paramètres",
                [
                    { text : "Annuler", style: "cancel" },
                    { text : "Paramètres", onPress: () => Linking.openSettings()}
                ]
            );
            return false;
        }

        const newPermission = await Audio.requestRecordingPermissionsAsync();

        if (newPermission.status === "granted") {
            return true;
        } else {
            Alert.alert(
                "Permission requise",
                "L'application a besoin de l'accès au microphone pour fonctionner",
                [   { text : "Annuler", style: "cancel" },
                    { text : "Autoriser", onPress: () => checkAudioPermission() }
                ]
            );
            return false;
        }
    }   catch (error) {
        console.error("Erreur lors de la vérification de la permission:", error);
        Alert.alert("Erreur", "Une erreur est survenue lors de la vérification de la permission.");
        return false; 
    }
}