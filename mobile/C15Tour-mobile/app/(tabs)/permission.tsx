import { Button, View, StyleSheet } from "react-native";
import checkLocationPermission from "../services/permissions/locationPermissionService";
import checkMicrophonePermission from "../services/permissions/microphonePermissionService";

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