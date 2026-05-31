import { Text, StyleSheet, View } from "react-native";
import { useAuth } from "@/context/auth";
import SpeedIcon from '../../../../shared/global_assets/pictos/Speed.svg';

const SPEED_DEFAULT_VALUE = 50;

export default function ConvoySpeed() {
  const { trip } = useAuth();

  const speed =
    typeof trip?.trip_speed === "number"
      ? trip.trip_speed
      : SPEED_DEFAULT_VALUE;

  return (
    <View style={styles.convoySpeed}>
      <SpeedIcon width={18} height={18} color="#BB487C" />
      <Text style={styles.convoySpeedText}>{speed} Km/h</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  convoySpeed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  convoySpeedText: {
    color: '#BB487C',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
