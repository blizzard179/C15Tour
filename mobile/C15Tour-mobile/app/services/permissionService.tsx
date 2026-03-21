import { Alert, PermissionsAndroid } from "react-native";

export default async function requestPermissions() {
    try {
        console.log("ok");
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        console.log("perm");
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            console.log("granted");
        }else {
            Alert.alert("Problème","Vous ne pouvez pas utiliser l'application sans l'usage de la localisation. Vous pouvez changer ce choix dans les paramètres de votre téléphone.")
            console.log("denied");
        }
    } catch (err) {
        console.warn(err);
    }
}