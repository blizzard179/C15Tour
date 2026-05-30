import React, { useRef, useState } from 'react';
import { StyleSheet, ImageBackground, TouchableOpacity, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, {
  Extrapolation,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ScrollUp from '@/components/ui/scroll-up';
import { useAppTheme } from '@/context/theme';

const BASE_LOGO_SIZE = 220;
const TOP_SAFE_AREA = 60;   // approx status bar height
const LOGO_PADDING = 16;    // min gap between logo edge and screen top / sheet top

export default function LoginScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const { colorScheme, toggleTheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  const { height: screenHeight } = useWindowDimensions();
  const animatedPosition = useSharedValue(screenHeight * 0.85);
  const expandedSheetPosition = screenHeight * 0.25;
  const collapsedSheetPosition = screenHeight * 0.85;

  const logoStyle = useAnimatedStyle(() => {
    // Available vertical space between the status bar and the sheet's top edge
    const available = animatedPosition.value - TOP_SAFE_AREA;

    // Maximum size that fits with padding on both sides
    const maxSize = Math.max(0, available - LOGO_PADDING * 2);
    const scale = maxSize < BASE_LOGO_SIZE ? maxSize / BASE_LOGO_SIZE : 1;
    const effectiveSize = BASE_LOGO_SIZE * scale;

    // Vertically center the logo in the available space
    const top = TOP_SAFE_AREA + (available - effectiveSize) / 2;

    return {
      top,
      transform: [{ scale }],
    };
  });

  const contentPaddingStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(
      animatedPosition.value,
      [expandedSheetPosition, collapsedSheetPosition],
      [48, 10],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <ImageBackground
      source={require('../assets/images/damier_accueil_mobile.png')}
      style={styles.background}
    >
      <GestureHandlerRootView style={styles.container}>
        <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
          <MaterialIcons
            name={isDark ? 'light-mode' : 'dark-mode'}
            size={26}
            color={isDark ? '#fff' : '#333'}
          />
        </TouchableOpacity>

        <Animated.Image
          source={require('../assets/images/Logo_1.png')}
          style={[styles.logo, logoStyle]}
          resizeMode="contain"
        />

        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={['15%', '65%']}
          enableDynamicSizing={false}
          enableOverDrag={false}
          onChange={setSheetIndex}
          animatedPosition={animatedPosition}
          backgroundStyle={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}
          handleIndicatorStyle={{ backgroundColor: isDark ? '#555' : '#ccc' }}
        >
          <BottomSheetView style={styles.contentContainer}>
            <Animated.View style={contentPaddingStyle}>
              <ScrollUp
                collapsed={sheetIndex === 0}
                animatedPosition={animatedPosition}
                expandedSheetPosition={expandedSheetPosition}
                collapsedSheetPosition={collapsedSheetPosition}
              />
            </Animated.View>
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
  },
  themeToggle: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  logo: {
    position: 'absolute',
    alignSelf: 'center',
    width: BASE_LOGO_SIZE,
    height: BASE_LOGO_SIZE,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 36,
    paddingBottom: 36,
    alignItems: 'center',
  },
});
