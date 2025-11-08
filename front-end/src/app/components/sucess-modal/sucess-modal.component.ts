import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-sucess-modal',
  templateUrl: './sucess-modal.component.html',
  styleUrls: ['./sucess-modal.component.scss']
})
export class SucessoModalComponent {
  mostrarMensagemSucesso: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<SucessoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title?: string; message?: string; prefix?: string; linkText?: string; linkTo?: string | any[]; suffix?: string }
  ) {}

  fechar() {
    this.dialogRef.close();
  }
}
