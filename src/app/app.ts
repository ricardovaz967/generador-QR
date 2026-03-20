import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  url = '';
  format: 'png' | 'svg' = 'png';
  size = 256;
  isLoading = false;

  qrSrc = '';
  downloadHref = '';
  downloadName = '';

  statusMessage = '✓ Aún no se ha generado ningún QR';
  statusKind: 'success' | 'error' | 'neutral' = 'success';

  readonly sizeOptions = [128, 192, 256, 384, 512, 768, 1024];

  private currentObjectUrl: string | null = null;

  private setStatus(message: string, kind: 'success' | 'error' | 'neutral'): void {
    this.statusMessage = message;
    this.statusKind = kind;
  }

  private normalizeUrlForQr(value: string): string | null {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw);
    const candidate = hasScheme ? raw : `https://${raw}`;

    try {
      return new URL(candidate).toString();
    } catch {
      return null;
    }
  }

  private clampSize(px: number): number {
    const n = Number(px);
    const safe = Number.isFinite(n) ? n : 256;
    return Math.min(Math.max(safe, 100), 2048);
  }

  private releaseObjectUrl(): void {
    if (!this.currentObjectUrl) return;
    URL.revokeObjectURL(this.currentObjectUrl);
    this.currentObjectUrl = null;
  }

  private clearResult(): void {
    this.releaseObjectUrl();
    this.qrSrc = '';
    this.downloadHref = '';
    this.downloadName = '';
  }

  async onGenerate(): Promise<void> {
    this.clearResult();

    const normalizedUrl = this.normalizeUrlForQr(this.url);
    if (!normalizedUrl) {
      this.setStatus('Ingresa una URL válida.', 'error');
      return;
    }

    this.isLoading = true;
    this.setStatus('Generando QR...', 'neutral');

    try {
      const width = this.clampSize(this.size);
      let generatedUrl = '';

      if (this.format === 'svg') {
        const svg = await QRCode.toString(normalizedUrl, {
          type: 'svg',
          width,
          margin: 1,
          errorCorrectionLevel: 'M'
        });

        const blob = new Blob([svg], { type: 'image/svg+xml; charset=utf-8' });
        generatedUrl = URL.createObjectURL(blob);
      } else {
        const dataUrl = await QRCode.toDataURL(normalizedUrl, {
          type: 'image/png',
          width,
          margin: 1,
          errorCorrectionLevel: 'M'
        });

        generatedUrl = dataUrl;
      }

      this.currentObjectUrl = generatedUrl;
      this.qrSrc = generatedUrl;
      this.downloadHref = generatedUrl;
      this.downloadName = `qr-${Date.now()}.${this.format}`;
      this.setStatus('✓ QR generado correctamente.', 'success');
    } catch (error) {
      this.clearResult();
      this.setStatus(`No se pudo generar el QR. (${String((error as Error)?.message || error)})`, 'error');
    } finally {
      this.isLoading = false;
    }
  }
}
