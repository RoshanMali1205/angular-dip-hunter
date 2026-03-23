import { Injectable, signal } from '@angular/core';

export type DialogType = 'confirm' | 'alert' | 'prompt' | 'danger';

export interface DialogConfig {
  type: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** For prompt dialogs */
  inputLabel?: string;
  inputValue?: string;
  inputPlaceholder?: string;
  /** Multi-line detail shown below the message */
  details?: string[];
}

interface DialogState extends DialogConfig {
  resolve: (value: boolean | string | null) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly state = signal<DialogState | null>(null);

  confirm(message: string, title = 'Confirm'): Promise<boolean> {
    return this.open({ type: 'confirm', title, message }) as Promise<boolean>;
  }

  /** Red-styled destructive confirm */
  danger(message: string, title = 'Warning'): Promise<boolean> {
    return this.open({ type: 'danger', title, message }) as Promise<boolean>;
  }

  alert(message: string, title = 'Info'): Promise<boolean> {
    return this.open({ type: 'alert', title, message }) as Promise<boolean>;
  }

  prompt(message: string, defaultValue = '', title = 'Input'): Promise<string | null> {
    return this.open({
      type: 'prompt',
      title,
      message,
      inputValue: defaultValue,
      inputPlaceholder: 'Enter value...'
    }) as Promise<string | null>;
  }

  /** Full config open */
  open(config: DialogConfig): Promise<boolean | string | null> {
    return new Promise(resolve => {
      this.state.set({ ...config, resolve });
    });
  }

  /** Called by the dialog component */
  _close(result: boolean | string | null): void {
    const s = this.state();
    if (s) {
      s.resolve(result);
      this.state.set(null);
    }
  }
}
