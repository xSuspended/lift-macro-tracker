import { Platform, Share } from 'react-native';

/** What happened when we tried to share: the phone's share sheet, or a copy on the web. */
export type ShareResult = 'shared' | 'copied' | 'show-link';

/**
 * Opens the phone's share sheet, or copies to the clipboard in a browser.
 * Returns 'show-link' when neither works, so the caller can show the link
 * for the person to copy by hand.
 */
export async function shareText(message: string, title: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(message);
      return 'copied';
    } catch {
      return 'show-link';
    }
  }
  await Share.share({ message, title });
  return 'shared';
}
