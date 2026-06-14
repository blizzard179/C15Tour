import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, ImageBackground, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetHandle, BottomSheetView, type BottomSheetHandleProps } from '@gorhom/bottom-sheet';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScrollUp from '@/components/ui/scroll-up';
import { useAppTheme } from '@/context/theme';

const BASE_LOGO_SIZE = 220;
const TOP_SAFE_AREA = 60;   // approx status bar height
const LOGO_PADDING = 16;    // min gap between logo edge and screen top / sheet top

export default function LoginScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const previousSheetIndexRef = useRef(1);
  const isKeyboardOpenRef = useRef(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [isScrollUpTouched, setIsScrollUpTouched] = useState(false);
  const insets = useSafeAreaInsets();
  const { colorScheme, toggleTheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  const { height: screenHeight } = useWindowDimensions();
  const animatedPosition = useSharedValue(screenHeight * 0.85);
  const scrollHintProgress = useSharedValue(0);
  const expandedSheetPosition = screenHeight * 0.25;
  const collapsedSheetPosition = screenHeight * 0.85;

  const hideScrollHint = useCallback(() => {
    setIsScrollUpTouched(true);
  }, []);

  const renderBottomSheetHandle = useCallback(
    (props: BottomSheetHandleProps) => (
      <View onTouchStart={hideScrollHint}>
        <BottomSheetHandle
          {...props}
          indicatorStyle={{ backgroundColor: isDark ? '#555' : '#ccc' }}
        />
      </View>
    ),
    [hideScrollHint, isDark]
  );

  const logoStyle = useAnimatedStyle(() => {
    // Available vertical space between the status bar and the sheet's top edge
    const available = animatedPosition.value - TOP_SAFE_AREA;

    // Maximum size that fits with padding on both sides
    const maxSize = Math.max(0, available - LOGO_PADDING * 2);
    const scale = maxSize < BASE_LOGO_SIZE ? maxSize / BASE_LOGO_SIZE : 1;

    // The scale transform keeps the image layout box centered on itself, so
    // place the unscaled box center between the status bar and the sheet.
    const top = TOP_SAFE_AREA + available / 2 - BASE_LOGO_SIZE / 2;

    return {
      top,
      transform: [{ scale }],
    };
  });

  const contentPaddingStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(
      animatedPosition.value,
      [expandedSheetPosition, collapsedSheetPosition],
      [10, 10],
      Extrapolation.CLAMP
    ),
  }));

  const scrollHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollHintProgress.value, [0, 1], [0.7, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollHintProgress.value, [0, 1], [8, -8], Extrapolation.CLAMP),
      },
    ],
  }));

  useEffect(() => {
    scrollHintProgress.value = 0;
    scrollHintProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [scrollHintProgress]);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  useEffect(() => {
    const keyboardShowSubscription = Keyboard.addListener('keyboardDidShow', () => {
      isKeyboardOpenRef.current = true;
      previousSheetIndexRef.current = sheetIndex;
      bottomSheetRef.current?.snapToPosition('100%');
    });

    const keyboardHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      isKeyboardOpenRef.current = false;
      bottomSheetRef.current?.snapToIndex(previousSheetIndexRef.current);
    });

    return () => {
      keyboardShowSubscription.remove();
      keyboardHideSubscription.remove();
    };
  }, [sheetIndex]);

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

        {sheetIndex === 0 && !isScrollUpTouched && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.scrollHint,
              { bottom: screenHeight * 0.13 + insets.bottom + 6 },
              scrollHintStyle,
            ]}
          >
            <MaterialIcons name="keyboard-arrow-up" size={42} color="#fff" style={styles.scrollHintArrowTop} />
            <MaterialIcons name="keyboard-arrow-up" size={42} color="#fff" style={styles.scrollHintArrowBottom} />
          </Animated.View>
        )}

        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={['13%', '65%']}
          enableDynamicSizing={false}
          enableOverDrag={false}
          keyboardBehavior="fillParent"
          keyboardBlurBehavior="none"
          android_keyboardInputMode="adjustResize"
          bottomInset={insets.bottom}
          onChange={(index) => {
            if (!isKeyboardOpenRef.current) {
              setSheetIndex(index);
            }

          }}
          onAnimate={(fromIndex, toIndex) => {
            if (fromIndex === 0 && toIndex !== 0) {
              setIsScrollUpTouched(true);
            }
          }}
          animatedPosition={animatedPosition}
          backgroundStyle={{ backgroundColor: isDark ? '#1c1c1e' : '#fff' }}
          handleComponent={renderBottomSheetHandle}
        >
          <BottomSheetView style={styles.contentContainer} onTouchStart={hideScrollHint}>
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
  scrollHint: {
    position: 'absolute',
    zIndex: 8,
    alignSelf: 'center',
    width: 64,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollHintArrowTop: {
    marginBottom: -26,
  },
  scrollHintArrowBottom: {
    marginTop: -26,
  },
  contentContainer: {
    paddingHorizontal: 36,
    paddingBottom: 36,
    alignItems: 'center',
  },
});
