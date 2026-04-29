import { Injectable } from '@angular/core';
import { APP_VERSION, WHATS_NEW_RELEASES, WhatsNewRelease } from '../config/app-release.config';

const LAST_SEEN_VERSION_KEY = 'dip_hunter_last_seen_version';

@Injectable({
  providedIn: 'root'
})
export class WhatsNewService {
  readonly appVersion = APP_VERSION;
  readonly storageKey = LAST_SEEN_VERSION_KEY;
  readonly releases = WHATS_NEW_RELEASES;

  hasLastSeenVersion(): boolean {
    return localStorage.getItem(this.storageKey) !== null;
  }

  seedCurrentVersionIfMissing(): boolean {
    if (this.hasLastSeenVersion()) {
      return false;
    }

    localStorage.setItem(this.storageKey, this.appVersion);
    return true;
  }

  shouldShowWhatsNew(): boolean {
    const lastSeenVersion = localStorage.getItem(this.storageKey);

    if (!lastSeenVersion) {
      return false;
    }

    return lastSeenVersion !== this.appVersion;
  }

  markAsSeen(): void {
    localStorage.setItem(this.storageKey, this.appVersion);
  }

  getLatestRelease(): WhatsNewRelease | null {
    if (this.releases.length === 0) {
      return null;
    }

    const currentVersionRelease = this.releases.find(
      (release) => release.version === this.appVersion
    );

    return currentVersionRelease ?? this.releases[0];
  }
}