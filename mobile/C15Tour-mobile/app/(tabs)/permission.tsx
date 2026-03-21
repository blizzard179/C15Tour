import { Button, View, StyleSheet } from "react-native";
import checkLocationPermission from "../services/permissionService";

export default function PermissionScreen() {
  const handlePress = async () => {
    try {
      await checkLocationPermission();
    } catch (error) {
      console.error("Erreur complète:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Demander les permissions" onPress={handlePress} />
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