import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes text to a temporary file and opens the share sheet so it can be saved, emailed or messaged. */
export async function shareTextFile(filename: string, content: string, mimeType: string) {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  await file.write(content);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
}

/** Lets the person pick a file and returns its text, or null if they cancelled. */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  return new File(result.assets[0].uri).text();
}
