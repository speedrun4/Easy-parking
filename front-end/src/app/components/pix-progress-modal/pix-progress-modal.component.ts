import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface PixProgressData {
  paymentId: number;
  status: string; // INICIANDO | WAITING | PAID | ERRO | TIMEOUT
  qrBase64: string | null;
  qrPayload: string | null;
  errorMsg?: string;
}

@Component({
  selector: 'app-pix-progress-modal',
  templateUrl: './pix-progress-modal.component.html',
  styleUrls: ['./pix-progress-modal.component.scss']
})
export class PixProgressModalComponent {
  status: string;
  qrBase64: string | null;
  qrPayload: string | null;
  errorMsg: string | undefined;
  paymentId: number;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PixProgressData,
    private dialogRef: MatDialogRef<PixProgressModalComponent>
  ) {
    this.status = data.status;
    this.qrBase64 = data.qrBase64;
    this.qrPayload = data.qrPayload;
    this.paymentId = data.paymentId;
    this.errorMsg = data.errorMsg;
  }

  close() {
    this.dialogRef.close();
  }
}
