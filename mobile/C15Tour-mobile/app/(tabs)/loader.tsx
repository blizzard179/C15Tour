import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';

import LogoAccueil from '../../../../shared/global_assets/logo_accueil.svg';

const damier = require('../../assets/images/damier_accueil_mobile.png');
const loaderAnimation = require('../../../../shared/global_assets/gif/loadingLoop.gif');
const loaderAnimationJump = require('../../../../shared/global_assets/gif/loadingJump.gif');
const LOADER_CYCLE_DURATION_MS = 4500;
const LOOP_PROBABILITY = 0.25;

type Profile = 'leader' | 'participant';

function pickLoaderGif() {
  return Math.random() < LOOP_PROBABILITY ? loaderAnimation : loaderAnimationJump;
}

export default function LoaderScreen() {
  const translateX = useRef(new Animated.Value(300)).current;
  const profile: Profile = 'leader';
  const [isMapReady] = useState(false);
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
