import { Redirect } from 'expo-router';

// Index du groupe (tabs) : redirige systématiquement vers l'écran de carte (explore),
// qui est le véritable écran principal de l'application une fois connecté.
export default function Index() {
  return <Redirect href="/(tabs)/explore" />;
}
