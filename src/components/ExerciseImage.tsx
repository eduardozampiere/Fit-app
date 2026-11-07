import { Image } from 'react-native';

/**
 * Imagem do exercício (hospedada fora do app). As imagens são faixas largas com as posições inicial e
 * final; `contain` mostra a faixa inteira, `cover` recorta (miniatura redonda). O iOS guarda em cache
 * depois da primeira vez; sem internet e sem cache o espaço fica vazio, e quem usa deixa um ícone por baixo.
 */
export function ExerciseImage({
  uri,
  width,
  height,
  fit = 'cover',
}: {
  uri: string;
  width: number;
  height: number;
  fit?: 'cover' | 'contain';
}) {
  return (
    <Image source={{ uri, cache: 'force-cache' }} style={{ width, height }} resizeMode={fit} accessibilityIgnoresInvertColors />
  );
}
