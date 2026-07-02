import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';
import Home from './Home';
import Carte from './Carte';
import Error from './helper/ErrorHelper';

// Déclaration des routes de l'application :
// "/" affiche l'écran d'accueil, "/map" affiche la carte interactive.
// Chaque route utilise le même composant d'erreur en cas de problème de navigation.
const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <Error/>
  },
  {
    path: '/map',
    element: <Carte />,
    errorElement: <Error/>
  }
]);

// Composant racine : fournit le routeur à toute l'application.
function App() {
  return <RouterProvider router={router} />
}

export default App
