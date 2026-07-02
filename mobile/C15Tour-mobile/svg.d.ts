// Déclaration de types pour TypeScript : permet d'importer un fichier .svg
// directement comme un composant React (transformé par react-native-svg-transformer)
declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;
  export default content;
}
