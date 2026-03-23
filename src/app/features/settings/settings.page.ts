import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../core/services/settings.service';
import { StorageService } from '../../core/services/storage.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService, Language } from '../../core/services/language.service';
import { UserService } from '../../core/services/user.service';
import { TourService } from '../../core/services/tour.service';
import { QuoteService } from '../../core/services/quote.service';
import { DialogService } from '../../shared/components/dialog/dialog.service';
import { DASHBOARD_TOUR_STEPS } from '../../core/tour/tour.config';
import { RedRuleType, QuoteDataSource } from '../../core/models/settings.model';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.page.html'
})
export class SettingsPageComponent implements OnInit {
  private readonly tourService = inject(TourService);
  private readonly dialog = inject(DialogService);
  
  // Current settings from service (use getter to avoid initialization issues)
  get settings() { return this.settingsService.settings; }
  
  // Editable form state
  redRule = computed(() => this.settings().redRule);
  refreshIntervalSeconds = computed(() => this.settings().refreshIntervalSeconds);
  
  // Form values
  thresholdValue = signal(0);
  refreshSeconds = signal(300);
  selectedRuleType = signal<RedRuleType>('CHANGE_PERCENT_NEGATIVE');
  selectedDataSource = signal<QuoteDataSource>('yahoo');
  
  // User profile
  userName = signal('');
  
  // Export/Import state
  exportData = signal<string | null>(null);
  importError = signal<string | null>(null);
  importSuccess = signal(false);
  
  constructor(
    private settingsService: SettingsService,
    private storageService: StorageService,
    private quoteService: QuoteService,
    public themeService: ThemeService,
    public lang: LanguageService,
    public userService: UserService
  ) {}

  ngOnInit(): void {
    const rule = this.redRule();
    this.selectedRuleType.set(rule.type);
    this.thresholdValue.set(rule.threshold ?? 0);
    this.refreshSeconds.set(this.refreshIntervalSeconds());
    this.selectedDataSource.set(this.settings().quoteDataSource || 'yahoo');
    this.userName.set(this.userService.user().name);
  }
  
  // User Profile
  onUserNameChange(): void {
    const name = this.userName();
    if (name.trim()) {
      this.userService.updateUser({ name: name.trim() });
    }
  }
  
  onAvatarFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.userService.setAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  }
  
  removeAvatar(): void {
    this.userService.removeAvatar();
  }
  
  // Language
  onLanguageChange(lang: Language): void {
    this.lang.setLanguage(lang);
  }
  
  // Red Rule settings
  onRuleTypeChange(type: RedRuleType): void {
    this.selectedRuleType.set(type);
    this.settingsService.updateSettings({
      redRule: { type, threshold: type === 'CHANGE_PERCENT_THRESHOLD' ? this.thresholdValue() : undefined }
    });
  }
  
  onThresholdChange(): void {
    const value = this.thresholdValue();
    this.settingsService.updateSettings({
      redRule: { type: 'CHANGE_PERCENT_THRESHOLD', threshold: value }
    });
  }
  
  // Refresh settings
  onRefreshIntervalChange(): void {
    const seconds = this.refreshSeconds();
    this.settingsService.updateSettings({
      refreshIntervalSeconds: seconds
    });
  }
  
  // Data Source settings
  onDataSourceChange(source: QuoteDataSource): void {
    this.selectedDataSource.set(source);
    this.settingsService.updateSettings({
      quoteDataSource: source
    });
    // Clear quote cache to force refresh with new source
    this.quoteService.clearCache();
  }
  
  // Clear quote cache
  async onClearQuoteCache(): Promise<void> {
    this.quoteService.clearCache();
    await this.dialog.alert('Quote cache cleared! Refresh the dashboard to fetch new prices.', 'Cache Cleared');
  }
  
  // Export data
  onExport(): void {
    const data = this.storageService.exportAll();
    this.exportData.set(JSON.stringify(data, null, 2));
  }
  
  onCopyExport(): void {
    const data = this.exportData();
    if (data) {
      navigator.clipboard.writeText(data).then(() => {
        // Could show a toast notification here
      });
    }
  }
  
  onDownloadExport(): void {
    const data = this.exportData();
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dip-hunter-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
  
  // Import data
  onImportFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      this.importData(content);
    };
    reader.readAsText(file);
  }
  
  importData(jsonString: string): void {
    this.importError.set(null);
    this.importSuccess.set(false);
    
    try {
      const data = JSON.parse(jsonString);
      const success = this.storageService.importAll(data);
      if (success) {
        this.importSuccess.set(true);
        // Reload the page to reflect imported data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        this.importError.set('Failed to import data. Please check the format.');
      }
    } catch (e) {
      this.importError.set('Invalid JSON file. Please check the format and try again.');
    }
  }
  
  // Reset data
  async onResetData(): Promise<void> {
    const first = await this.dialog.danger('Are you sure you want to reset ALL data? This cannot be undone.', 'Reset All Data');
    if (!first) return;
    const second = await this.dialog.danger('This will delete all folders, stocks, transactions, plans, and settings. Are you absolutely sure?', 'Final Warning');
    if (second) {
      localStorage.clear();
      window.location.reload();
    }
  }
  
  // Restart tour
  restartTour(): void {
    this.tourService.restart(DASHBOARD_TOUR_STEPS);
  }
  
  // Format helpers
  getRedRuleDescription(): string {
    const rule = this.redRule();
    if (rule.type === 'CHANGE_PERCENT_NEGATIVE') {
      return 'Stock is red when changePercent is negative (< 0%)';
    } else if (rule.type === 'CHANGE_PERCENT_THRESHOLD') {
      return `Stock is red when changePercent is less than ${rule.threshold ?? 0}%`;
    }
    return 'Custom rule';
  }
}
