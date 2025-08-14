import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <mat-icon color="warn" class="alert-icon">warning</mat-icon>
      </div>
      <h1 mat-dialog-title>Reserva!</h1>
      <div mat-dialog-content>
        <p>{{ data.message }}</p>
      </div>
      <div mat-dialog-actions>
        <button mat-raised-button color="primary" (click)="onConfirm()">Sim</button>
        <button mat-raised-button color="warn" (click)="onCancel()">Não</button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      background-color: #fff8e1; /* Fundo amarelo claro */
      padding: 20px;
      border-radius: 8px;
    }
    .dialog-header {
      display: flex;
      justify-content: center;
      margin-bottom: 10px;
    }
    .alert-icon {
      font-size: 40px;
    }
    h1 {
      text-align: center;
      color: #f57c00; /* Texto laranja escuro */
    }
    div[mat-dialog-content] {
      text-align: center;
      margin-top: 10px;
      color: #6d4c41; /* Texto marrom */
    }
    div[mat-dialog-actions] {
      justify-content: center;
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string }
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
