import { Pressable, StyleSheet } from 'react-native';
import MicIcon from '../../../../shared/global_assets/pictos/Mic.svg';
import MicMutedIcon from '../../../../shared/global_assets/pictos/MicMuted.svg';

type MicButtonProps = {
  isActive?: boolean;
  onPress?: () => void;
};

// Bouton d'ouverture/fermeture du panneau micro (visible uniquement pour
// l'organisateur du convoi, voir app/(tabs)/explore.tsx)
export default function MicButton({
  isActive = false,
  onPress,
}: MicButtonProps) {
  const IconComponent = isActive ? MicIcon : MicMutedIcon;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, isActive && styles.buttonActive]}
    >
      <IconComponent
        width={24}
        height={44}
        color={isActive ? '#FFFFFF' : '#BB487C'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: '#BB487C',
    elevation: 4,
  },
  buttonActive: {
    backgroundColor: '#942968',
    borderColor: '#FFF',
  },
});
