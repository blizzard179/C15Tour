import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import CursorVehicule from '../../../../shared/global_assets/pictos/CursorVehicule.svg';
import CursorVehiculeLeader from '../../../../shared/global_assets/pictos/CursorVehiculeLeader.svg';

const urlOpenStreetView =
  'https://www.openstreetmap.org/export/embed.html?bbox=-1.595%2C47.196%2C-1.505%2C47.237&layer=mapnik';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <WebView source={{ uri: urlOpenStreetView }} style={styles.webview} />

      <View style={styles.cursorVehicule}>
        <CursorVehicule width={40} height={40} />
      </View>
      <View style={styles.cursorVehiculeLeader}>
        <CursorVehiculeLeader width={40} height={40} />
      </View>
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
  cursorVehicule: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  cursorVehiculeLeader: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  }
});
