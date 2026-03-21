import { Button, View, StyleSheet } from "react-native";
import requestPermissions from "../services/permissionService";

export default function PermissionScreen() {
  return (
    <View style={styles.container}>
      <Button title="Demander les permissions" onPress={requestPermissions} />
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