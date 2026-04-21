import { StyleSheet, Text, View } from 'react-native';

const DEFAULT_CONVOY_NAME = 'C15 Fiesta Tour #1';

export default function ConvoyName() {
  return (
    <View style={styles.container}>
      <Text numberOfLines={1} style={styles.label}>
        {DEFAULT_CONVOY_NAME}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(187, 72, 124, 0.5)',
  },
  label: {
    color: '#BB487C',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
