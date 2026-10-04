import { Linking } from 'react-native';
import { appLinks, webLinks, type AppLinks } from '@danbro96/lupira-domain-links/appLinks';
import { SIBLING_WEB_HOSTS } from '../config';

const inApp = appLinks();
const onWeb = webLinks(SIBLING_WEB_HOSTS);

/** Opens a sibling app at a link, or its web page when the app isn't installed. openURL rather than
 *  canOpenURL: Android 11+ answers false for any scheme the manifest doesn't list under <queries>. */
export async function openSibling(link: (links: AppLinks) => string): Promise<void> {
  try {
    await Linking.openURL(link(inApp));
  } catch {
    await Linking.openURL(link(onWeb));
  }
}
