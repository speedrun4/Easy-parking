import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-sucess-modal',
  templateUrl: './sucess-modal.component.html',
  styleUrls: ['./sucess-modal.component.scss']
})
export class SucessoModalComponent {
  dialogRef: any;
  mostrarMensagemSucesso: boolean = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { message: string }) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.mostrarMensagemSucesso = false;
    }, 3000);
  }

}
