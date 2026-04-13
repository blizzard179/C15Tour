import { Button, View, StyleSheet } from "react-native";
import checkLocationPermission from "../services/permissions/locationPermissionService";
import checkMicrophonePermission from "../services/permissions/microphonePermissionService";
<<<<<<< HEAD
import { getLocation, startTracking } from "../services/locations/locationService";
=======
import getLocation from "../services/locations/locationService";
>>>>>>> a7bf74b (feat: getLocation)

export default function PermissionScreen() {
  const handlePress = async () => {
    try {
      await checkLocationPermission();
    } catch (error) {
      console.error("Erreur complète:", error);
    }
  };

  const microPermission = async () => {
    try {
      await checkMicrophonePermission();
    } catch (error) {
      console.error("Erreur complète:", error);
    }
  };


  return (
    <View style={styles.container}>
      <Button title="Demander les permissions de localisation" onPress={handlePress} />
      <Button title="Demander les permissions de micro" onPress={microPermission} />
      <Button title="Get Location" onPress={getLocation} />
<<<<<<< HEAD
      <Button title="Start Tracking" onPress={startTracking} />
=======
>>>>>>> a7bf74b (feat: getLocation)
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});