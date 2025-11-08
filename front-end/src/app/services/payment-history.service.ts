import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaymentHistory } from '../models/payment-history.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentHistoryService {

  private apiUrl = `${environment.apiBaseUrl}/api/pagamentos`;

  constructor(private http: HttpClient) {}

   getPaymentHistory(usuarioId?: number): Observable<PaymentHistory[]> {
    if (usuarioId) {
      return this.http.get<PaymentHistory[]>(`${this.apiUrl}?usuarioId=${usuarioId}`);
    }
    return this.http.get<PaymentHistory[]>(this.apiUrl);
  }

  deletePayment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

salvarPagamento(dadosPagamento: any) {
    return this.http.post(this.apiUrl, dadosPagamento);
  }

  iniciarPix(pagamentoId: number) {
    return this.http.post<{ pagbankChargeId?: string; status?: string; qrBase64?: string; qrPayload?: string }>(
      `${this.apiUrl}/${pagamentoId}/pagbank/pix`,
      {}
    );
  }

  consultarStatusPix(pagamentoId: number) {
    return this.http.get<{ status: string }>(`${this.apiUrl}/${pagamentoId}/pagbank/status`);
  }
}
