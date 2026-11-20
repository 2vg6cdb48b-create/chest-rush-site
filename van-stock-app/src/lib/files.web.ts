import * as DocumentPicker from 'expo-document-picker';

import { notify } from './ui';

/** The browser preview can't save files, so point people to the iPhone app. */
export async function shareTextFile(_filename: string, _content: string, _mimeType: string) {
  notify(
    'Works in the iPhone app',
    'Saving files isn’t available in the browser preview. In the iPhone app this opens the share sheet so you can save to Files, iCloud Drive or email.',
  );
}

export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file.text();
  const response = await fetch(asset.uri);
  return response.text();
}
