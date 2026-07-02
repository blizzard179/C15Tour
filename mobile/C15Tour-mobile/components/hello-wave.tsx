import Animated from 'react-native-reanimated';

// Composant fourni par le template Expo par défaut : émoji main qui s'anime en
// "coucou". Non utilisé actuellement dans l'application.
export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
  );
}
