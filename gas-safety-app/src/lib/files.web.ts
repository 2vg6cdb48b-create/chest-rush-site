import * as DocumentPicker from 'expo-document-picker';

/** In a browser, saving a file downloads it. */
export async function shareTextFile(filename: string, content: string, mimeType: string) {
  const doc = (globalThis as any).document;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = filename;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file.text();
  const response = await fetch(asset.uri);
  return response.text();
}
