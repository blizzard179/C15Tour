import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/auth';
import LogoAccueil from '../../../../shared/global_assets/logo_accueil.svg';

const damier = require('../../assets/images/damier_accueil_mobile.png');
const loaderAnimation = require('../../../../shared/global_assets/gif/loadingLoop.gif');
const loaderAnimationJump = require('../../../../shared/global_assets/gif/loadingJump.gif');
const LOADER_CYCLE_DURATION_MS = 4500; // durée entre deux tirages du gif affiché
const REDIRECT_DELAY_MS = 5000; // délai avant redirection automatique vers la carte
const LOOP_PROBABILITY = 0.2; // 20% de chances d'afficher le gif "boucle" plutôt que "saut"

export type LoaderProfile = 'leader' | 'participant';

type ConvoyLoaderProps = {
  profile: LoaderProfile;
  isMapReady?: boolean;
};

// Tire au hasard l'un des deux gifs d'animation, pour varier l'écran de chargement
function pickLoaderGif() {
  return Math.random() < LOOP_PROBABILITY ? loaderAnimation : loaderAnimationJump;
}

// Écran de chargement affiché après authentification (via join.tsx ou au
// démarrage de l'app), pendant la préparation de la carte. Réutilisable : peut
// aussi être affiché en tant qu'overlay le temps que la carte finisse de charger
// (isMapReady), sans le texte défilant une fois prête.
export function ConvoyLoader({ profile, isMapReady = false }: ConvoyLoaderProps) {
  const translateX = useRef(new Animated.Value(300)).current;
  const [currentLoaderGif, setCurrentLoaderGif] = useState(() => pickLoaderGif());
  const profileContent = {
    leader: {
      helloLabel: 'Bonjour Leader',
      loaderGif: currentLoaderGif,
    },
    participant: {
      helloLabel: 'Bonjour Participant',
      loaderGif: currentLoaderGif,
    },
  }[profile];
  const loaderText = isMapReady ? 'Convoi charge !' : 'Chargement en cours...';

  // Fait défiler le texte de droite à gauche en continu, puis le replace
  // instantanément à droite (duration: 0) pour reprendre le défilement en boucle
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: -300,
          duration: 4500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 300,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [translateX]);

  // Change périodiquement le gif affiché pour varier l'animation de chargement
  useEffect(() => {
    const gifRotation = setInterval(() => {
      setCurrentLoaderGif(pickLoaderGif());
    }, LOADER_CYCLE_DURATION_MS);

    return () => {
      clearInterval(gifRotation);
    };
  }, []);

  return (
    <ImageBackground source={damier} resizeMode="cover" style={styles.container}>
      <LogoAccueil width={220} height={150} />
      <Text style={styles.helloText}>{profileContent.helloLabel}</Text>

      <View style={styles.loader}>
        <Image source={profileContent.loaderGif} resizeMode="contain" style={styles.loaderGif} />

        <View style={styles.textTrack}>
          {isMapReady ? (
            <Text style={styles.text}>{loaderText}</Text>
          ) : (
            <Animated.Text style={[styles.text, { transform: [{ translateX }] }]}>
              {loaderText}
            </Animated.Text>
          )}
        </View>
      </View>
    </ImageBackground>
  );
}

// Écran de route dédié à /loader : affiche ConvoyLoader puis redirige
// automatiquement vers la carte après un délai fixe
export default function LoaderScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const profile: LoaderProfile = role ?? 'participant';

  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      router.replace('/(tabs)/explore');
    }, REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return <ConvoyLoader profile={profile} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: '25%',
  },
  helloText: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Montserrat',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#fff',
    width: '100%',
    textAlign: 'center',
  },
  loader: {
    width: '80%',
    minWidth: 200,
    padding: 30,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderGif: {
    width: 240,
    height: 80,
  },
  textTrack: {
    width: '100%',
    height: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  text: {
    fontFamily: 'Montserrat',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#BB487C',
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    textAlign: 'center',
  },
});
