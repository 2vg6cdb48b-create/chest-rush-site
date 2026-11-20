import * as Print from 'expo-print';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Turns the record into an A4 landscape PDF and opens the share sheet (email, WhatsApp, Files…). */
export async function shareRecordPdf(html: string, filename: string) {
  const { uri } = await Print.printToFileAsync({ html, width: 842, height: 595 });
  let shareUri = uri;
  try {
    const named = new File(Paths.cache, filename);
    if (named.exists) named.delete();
    new File(uri).copy(named);
    shareUri = named.uri;
  } catch {
    // Fall back to the generated file name.
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: filename,
  });
}

/** Opens the iPhone print screen, which can also save or share the PDF. */
export async function printRecord(html: string) {
  await Print.printAsync({ html, orientation: Print.Orientation.landscape });
}
