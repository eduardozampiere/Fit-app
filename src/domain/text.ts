// Texto: normalização sem acento. Única fonte para slugs e cabeçalhos de CSV.

/** Remove acentos (NFKD + marcas combinantes). */
export function stripAccents(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

/** "Pão de Queijo" → "pao-de-queijo" (separador configurável: "Peso (kg)" → "peso_kg"). */
export function slugify(text: string, separator: '-' | '_' = '-'): string {
  const sep = separator === '-' ? '-' : '_';
  return stripAccents(text.trim())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, sep)
    .replace(new RegExp(`^${sep}|${sep}$`, 'g'), '');
}
