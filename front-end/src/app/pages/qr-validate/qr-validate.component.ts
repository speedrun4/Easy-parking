import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { QrCodeService } from 'src/app/services/qr-code.service';

declare const Html5Qrcode: any;

@Component({
  selector: 'app-qr-validate',
  templateUrl: './qr-validate.component.html',
  styleUrls: ['./qr-validate.component.scss']
})
export class QrValidateComponent implements OnInit, OnDestroy {
  @ViewChild('scanner', { static: true }) scannerRef!: ElementRef<HTMLDivElement>;

  loading = false;
  scanResult?: string;
  message?: string;
  error?: string;
  html5Qr?: any;
  cameraId?: string;

  constructor(private qrService: QrCodeService) {}

  async ngOnInit() {
    await this.initScanner();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  async initScanner() {
    try {
      this.loading = true;
      // lazy load script if not present
      if (!(window as any).Html5Qrcode) {
        await this.loadScript('https://unpkg.com/html5-qrcode');
      }
      this.html5Qr = new (window as any).Html5Qrcode(this.scannerRef.nativeElement.id);
      const devices = await (window as any).Html5Qrcode.getCameras();
      this.cameraId = devices && devices.length ? devices[0].id : undefined;
      if (!this.cameraId) {
        this.error = 'Nenhuma câmera disponível.';
        this.loading = false;
        return;
      }
      await this.start();
      this.loading = false;
    } catch (e) {
      this.error = 'Falha ao iniciar câmera. Permita o acesso e tente novamente.';
      this.loading = false;
    }
  }

  async start() {
    if (!this.html5Qr || !this.cameraId) return;
    this.message = undefined;
    this.error = undefined;
    await this.html5Qr.start(
      { deviceId: { exact: this.cameraId } },
      { fps: 10, qrbox: 250 },
      (decodedText: string) => this.onScanSuccess(decodedText),
      () => {}
    );
  }

  async stop() {
    if (this.html5Qr) {
      try { await this.html5Qr.stop(); } catch {}
      try { await this.html5Qr.clear(); } catch {}
    }
  }

  async onScanSuccess(text: string) {
    // pausa antes de consumir
    await this.stop();
    this.scanResult = text;
    this.message = 'Validando QR...';
    this.error = undefined;

    this.qrService.consumeByToken(text).subscribe({
      next: (res: any) => {
        if (res?.status === 'ENTRY_CONSUMED') {
          this.message = 'Entrada validada com sucesso!';
        } else if (res?.status === 'EXIT_CONSUMED') {
          this.message = 'Saída validada com sucesso!';
        } else {
          this.message = 'QR validado.';
        }
      },
      error: (err: any) => {
        this.error = err?.error || 'QR inválido ou já utilizado.';
        this.message = undefined;
      }
    });
  }

  async resume() {
    this.scanResult = undefined;
    await this.start();
  }

  private loadScript(src: string) : Promise<void> {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.body.appendChild(s);
    });
  }
}
