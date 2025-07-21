import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentHistory } from '../models/payment-history.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentHistoryService {

  private apiUrl = 'http://localhost:8080/api/pagamentos';

  constructor(private http: HttpClient) {}

   getPaymentHistory(): Observable<PaymentHistory[]> {
    return this.http.get<PaymentHistory[]>(this.apiUrl);
  }

  deletePayment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

salvarPagamento(dadosPagamento: any) {
    return this.http.post(this.apiUrl, dadosPagamento);
  }
}
