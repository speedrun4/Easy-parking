import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-alert-dialog-cancel',
  templateUrl: './alert-dialog-cancel.component.html',
  styleUrls: ['./alert-dialog-cancel.component.scss']
})
export class AlertDialogCancelComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<AlertDialogCancelComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }) { }

  close(): void {
    this.dialogRef.close();
  }

  ngOnInit(): void {
  }

}
