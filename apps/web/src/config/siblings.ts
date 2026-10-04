import { webLinks, type AppHosts } from '@danbro96/lupira-domain-links/appLinks';

const env = import.meta.env;
const pick = (raw: string | undefined, prod: string, devPort: number) =>
  raw ?? (env.DEV ? `http://localhost:${devPort}` : prod);

export const SIBLING_HOSTS: AppHosts = {
  cal: pick(env.VITE_CAL_URL, 'https://cal.lupira.com', 5174),
  maps: pick(env.VITE_MAPS_URL, 'https://maps.lupira.com', 5175),
  photos: pick(env.VITE_PHOTOS_URL, 'https://photos.lupira.com', 5176),
  tasks: 'https://tasks.lupira.com',
};

export const links = webLinks(SIBLING_HOSTS);
