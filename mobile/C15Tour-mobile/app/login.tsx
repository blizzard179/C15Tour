import React, { useRef } from 'react';
import { View, StyleSheet, ImageBackground, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import ScrollUp from '@/components/ui/scroll-up';

export default function LoginScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);

  return (
    <ImageBackground
      source={require('../assets/images/damier_accueil_mobile.png')}
      style={styles.background}
    >
      <GestureHandlerRootView style={styles.container}>
        <Image
          source={require('../assets/images/Logo_1.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={['15%', '75%']}
        >
          <BottomSheetView style={styles.contentContainer}>
            <ScrollUp />
          </BottomSheetView>
        </BottomSheet>
      </GestureHandlerRootView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginTop: 50,
  },
  contentContainer: {
    flex: 1,
    padding: 36,
    alignItems: 'center',
  },
});
