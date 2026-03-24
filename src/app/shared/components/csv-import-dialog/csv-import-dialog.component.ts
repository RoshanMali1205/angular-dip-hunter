import { Component, inject, signal, output, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CsvImportService, ParseResult, ImportRow } from '../../../core/services/csv-import.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { PortfolioService } from '../../../core/services/portfolio.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-csv-import-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './csv-import-dialog.component.html'
})
export class CsvImportDialogComponent {
  private readonly csvImport = inject(CsvImportService);
  private readonly txnService = inject(TransactionService);
  private readonly portfolio = inject(PortfolioService);
  readonly themeService = inject(ThemeService);

  readonly closed = output<void>();
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  step = signal<'upload' | 'preview' | 'done'>('upload');
  parseResult = signal<ParseResult | null>(null);
  importedCount = signal(0);
  isDragOver = signal(false);
  errorMessage = signal('');

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.errorMessage.set('Please select a CSV file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('File too large. Maximum size is 5 MB.');
      return;
    }
    this.errorMessage.set('');
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const stocks = this.portfolio.getAllStocks();
      const result = this.csvImport.parse(text, stocks);
      this.parseResult.set(result);
      this.step.set('preview');
    };
    reader.readAsText(file);
  }

  confirmImport(): void {
    const result = this.parseResult();
    if (!result) return;

    const validRows = result.rows.filter(r => r.valid);
    const count = this.txnService.bulkImport(validRows.map(r => ({
      date: r.date,
      symbol: r.symbol,
      stockId: r.stockId,
      qty: r.qty,
      price: r.price,
      charges: r.charges,
      type: r.type
    })));

    this.importedCount.set(count);
    this.step.set('done');
  }

  close(): void {
    this.closed.emit();
  }

  reset(): void {
    this.step.set('upload');
    this.parseResult.set(null);
    this.importedCount.set(0);
    this.errorMessage.set('');
    const input = this.fileInput();
    if (input) input.nativeElement.value = '';
  }
}
