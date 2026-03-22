import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import BottomSheet from '@gorhom/bottom-sheet';

import { ThemedView } from '@/components/themed-view';
import ScrollUp from '@/components/ui/scroll-up';

const WEB_MAP_URL = 'http://localhost:5173/map';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.acceuilerContainer}>
      <WebView
        source={{ uri: WEB_MAP_URL }}
        style={StyleSheet.absoluteFill}
        startInLoadingState
      />

      <BottomSheet style={styles.titleContainer} snapPoints={['25%', '50%']}>
        <ScrollUp />
      </BottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  titleContainer: { zIndex: 10 },
  acceuilerContainer: { flex: 1 },
});
