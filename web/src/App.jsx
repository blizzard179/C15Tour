import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';
import Home from './Home';
import Carte from './Carte';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/map',
    element: <Carte />
  }
]);

function App() {
  return <RouterProvider router={router} />
}

export default App
