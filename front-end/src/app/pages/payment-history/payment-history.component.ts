import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentHistory } from 'src/app/models/payment-history.model';
import { AuthService } from 'src/app/services/auth.service';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss']
})
export class PaymentHistoryComponent implements OnInit {
  paymentHistory: PaymentHistory[] = [];

  constructor(
    private paymentHistoryService: PaymentHistoryService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      console.error('Usuário não autenticado!');
      return;
    }
    this.paymentHistoryService.getPaymentHistory(currentUser.id).subscribe(data => {
      this.paymentHistory = data;
    });
  }

  deletePayment(id: number) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: { message: 'Tem certeza que deseja excluir este pagamento?' }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.paymentHistoryService.deletePayment(id).subscribe(() => {
          this.loadPayments();
        });
      }
    });
  }

  goToRoute(payment: PaymentHistory) {
    if (!payment.latitude || !payment.longitude || !payment.endereco) {
      alert('Este pagamento não possui informações de localização salvas.');
      return;
    }
    const destination = {
      lat: payment.latitude,
      lon: payment.longitude,
      title: payment.estacionamento,
      address: payment.endereco
    };

    this.router.navigate(['/route'], {
      state: { destination }
    });
  }
}
