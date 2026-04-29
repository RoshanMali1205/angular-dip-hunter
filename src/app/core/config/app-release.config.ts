export type WhatsNewTag = 'new' | 'improved' | 'fix';

export interface WhatsNewHighlight {
  icon: 'spark' | 'rocket' | 'shield';
  tag: WhatsNewTag;
  textKey: string;
}

export interface WhatsNewRelease {
  version: string;
  date: string;
  highlights: WhatsNewHighlight[];
  changelogUrl?: string;
}

export const APP_VERSION = '1.1.0';

export const WHATS_NEW_RELEASES: WhatsNewRelease[] = [
  {
    version: APP_VERSION,
    date: '2026-04-29',
    highlights: [
      {
        icon: 'spark',
        tag: 'new',
        textKey: 'whatsNew.highlights.versionAwareModal'
      },
      {
        icon: 'rocket',
        tag: 'improved',
        textKey: 'whatsNew.highlights.startupFlowGuarded'
      },
      {
        icon: 'shield',
        tag: 'fix',
        textKey: 'whatsNew.highlights.authRouteExcluded'
      }
    ],
    changelogUrl: 'https://github.com/roshanmali/angular-dip-hunter/releases'
  }
];