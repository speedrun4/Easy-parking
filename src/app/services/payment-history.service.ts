import { Injectable } from '@angular/core';
import { PaymentHistory } from '../models/payment-history.model';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentHistoryService {

  private paymentHistory: PaymentHistory[] = [
    { id: 1, parkingName: 'Estacionamento Central', date: new Date('2024-09-10'), amountPaid: 15.00, location: 'Rua A, Centro' },
    { id: 2, parkingName: 'Estacionamento Shopping', date: new Date('2024-09-12'), amountPaid: 20.00, location: 'Shopping B' },
    { id: 3, parkingName: 'Estacionamento Aeroporto', date: new Date('2024-09-15'), amountPaid: 30.00, location: 'Aeroporto Internacional' }
  ];

  constructor() {}

  // Função para obter os dados de pagamento
  getPaymentHistory(): Observable<PaymentHistory[]> {
    return of(this.paymentHistory);
  }
}
