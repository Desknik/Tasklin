// Função utilitária para gerar uma cor a partir de uma string
// Sempre retorna a mesma cor para a mesma string

export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Gera cor HSL para melhor contraste e variedade
  const h = Math.abs(hash) % 360;
  const s = 65;
  const l = 55;
  return `hsl(${h}, ${s}%, ${l}%)`;
}
