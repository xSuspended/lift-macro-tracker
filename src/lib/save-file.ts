import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Phones: write the file to the app's cache, then open the share sheet so it can be
 * saved to Drive, emailed, and so on. (Web uses save-file.web.ts instead.)
 */
export async function saveTextFile(filename: string, contents: string, mimeType: string) {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing isn’t available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: `Save ${filename}` });
}
