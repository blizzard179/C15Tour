import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const urlOpenStreetView =
  'https://www.openstreetmap.org/export/embed.html?bbox=-1.595%2C47.196%2C-1.505%2C47.237&layer=mapnik';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <WebView source={{ uri: urlOpenStreetView }} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
