import type { MetadataRoute } from 'next';
import { loadSiteConfig } from '@omc/config';
import { createRobotsConfig } from '@omc/robots-config';

export default function robots(): MetadataRoute.Robots {
  const config = loadSiteConfig('petpalhq');
  return createRobotsConfig(config).metadataRoutesRobots() as MetadataRoute.Robots;
}
