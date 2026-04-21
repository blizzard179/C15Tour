import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';
import Home from './Home';
import Carte from './Carte';
import Error from './helper/ErrorHelper';

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

function App() {
  return <RouterProvider router={router} />
}

export default App
