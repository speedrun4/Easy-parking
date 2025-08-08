import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PaymentHistory } from 'src/app/models/payment-history.model';
import { AuthService } from 'src/app/services/auth.service';
import { PaymentHistoryService } from 'src/app/services/payment-history.service';

@Component({
  selector: 'app-payment-history',
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss']
})
export class PaymentHistoryComponent implements OnInit {
  paymentHistory: PaymentHistory[] = [];

  constructor(private paymentHistoryService: PaymentHistoryService, private authService: AuthService, private router: Router) { }

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
    if (confirm('Tem certeza que deseja excluir este pagamento?')) {
      this.paymentHistoryService.deletePayment(id).subscribe(() => {
        this.loadPayments(); // Recarrega a lista após exclusão
      });
    }
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
