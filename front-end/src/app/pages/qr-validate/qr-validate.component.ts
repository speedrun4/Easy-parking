import { Component, OnDestroy, OnInit } from '@angular/core';
import { BarcodeFormat } from '@zxing/library';
import { QrCodeService } from 'src/app/services/qr-code.service';

@Component({
  selector: 'app-qr-validate',
  templateUrl: './qr-validate.component.html',
  styleUrls: ['./qr-validate.component.scss']
})
export class QrValidateComponent implements OnInit, OnDestroy {
  loading = false;
  scanResult?: string;
  message?: string;
  error?: string;
  tokenInput: string = '';
  private processed = false;
  availableDevices: MediaDeviceInfo[] = [];
  selectedDevice?: MediaDeviceInfo;
  hasPermission = false;
  torchEnabled = false;
  torchAvailable = false;
  formats: BarcodeFormat[] = [BarcodeFormat.QR_CODE];

  constructor(private qrService: QrCodeService) {}

  async ngOnInit() {
    this.loading = false;
  }

  ngOnDestroy(): void {
    // no-op for zxing component
  }

  async onScanSuccess(text: string) {
    if (this.processed) { return; }
    this.processed = true;
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
    this.processed = false;
  }

  validateManual() {
    const token = this.tokenInput?.trim();
    if (!token) return;
    this.message = 'Validando QR...';
    this.error = undefined;
    this.qrService.consumeByToken(token).subscribe({
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

  onCamerasFound(devices: MediaDeviceInfo[]) {
    this.availableDevices = devices || [];
    // Prefer rear/back/environment camera
    const lower = (s: string) => (s || '').toLowerCase();
    const rear = this.availableDevices.find(d => {
      const l = lower(d.label);
      return l.includes('back') || l.includes('traseira') || l.includes('rear') || l.includes('environment');
    });
    this.selectedDevice = rear || this.availableDevices[this.availableDevices.length - 1] || this.availableDevices[0];
    this.processed = false;
  }

  onCamerasNotFound() {
    this.error = 'Nenhuma câmera disponível.';
  }

  onPermission(ok: boolean) {
    this.hasPermission = ok;
    if (!ok) {
      this.error = 'Permita o acesso à câmera para validar o QR.';
    } else {
      this.error = undefined;
    }
  }

  onTorchCompatible(ok: boolean) {
    this.torchAvailable = !!ok;
  }

  onDeviceSelect(deviceId: string) {
    const dev = this.availableDevices.find(d => d.deviceId === deviceId);
    if (dev) {
      this.selectedDevice = dev;
      this.processed = false;
    }
  }

  toggleTorch() {
    this.torchEnabled = !this.torchEnabled;
  }
}
