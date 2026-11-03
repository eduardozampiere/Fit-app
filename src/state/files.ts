import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Abre o seletor de arquivos e devolve o texto (CSV, JSON, Markdown). */
export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: ['text/*', 'application/json', 'text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', '*/*'],
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (Platform.OS === 'web') {
    const res = await fetch(asset.uri);
    return { name: asset.name, text: await res.text() };
  }
  return { name: asset.name, text: await new File(asset.uri).text() };
}

/** Grava um arquivo temporário e abre a folha de compartilhamento do iOS. */
export async function shareText(filename: string, content: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename, UTI: mimeType === 'application/json' ? 'public.json' : 'public.plain-text' });
}
