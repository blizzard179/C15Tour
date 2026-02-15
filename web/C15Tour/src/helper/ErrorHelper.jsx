import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

function Error() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    // Gérer les erreurs de réponse (ex: 404, 401)
    return (
      <div>
        <h1>Erreur {error.status}</h1>
        <p>{error.statusText}</p>
        {error.data?.message && <p>{error.data.message}</p>}
      </div>
    );
  } else if (error instanceof Error) {
    // Gérer les erreurs JavaScript classiques
    return <div>Erreur : {error.message}</div>;
  } else if (typeof error === 'string') {
    // Gérer les chaînes d'erreur
    return <div>Erreur : {error}</div>;
  } else {
    // Cas par défaut
    return <div>Une erreur inattendue s'est produite.</div>;
  }
}   

export default Error