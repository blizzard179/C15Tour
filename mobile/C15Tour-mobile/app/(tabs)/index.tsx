import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import ScrollUp from '@/components/ui/scroll-up';
import BottomSheet from '@gorhom/bottom-sheet';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.acceuilerContainer}>
      <BottomSheet style={styles.titleContainer} snapPoints={['25%', '50%']}>
        <ScrollUp />
      </BottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  acceuilerContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundImage: '@/assets/images/damier_acceuil.svg',
  },
});

