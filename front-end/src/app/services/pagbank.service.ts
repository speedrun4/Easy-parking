import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface PagBankPurchaseRequest {
  method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
  amount: number; // in BRL
  description?: string;
  referenceId?: string;
  card?: {
    number: string;
    exp_month: string;
    exp_year: string;
    security_code: string;
    holder: { name: string; tax_id?: string };
  };
}

@Injectable({ providedIn: 'root' })
export class PagBankService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  createPurchase(payload: PagBankPurchaseRequest) {
    return this.http.post(`${this.base}/api/pagbank/purchase`, payload);
  }

  // For existing local Pagamentos entity (PIX)
  createPixForPayment(paymentId: number) {
    return this.http.post(`${this.base}/api/pagamentos/${paymentId}/pagbank/pix`, {});
  }

  getPagBankStatus(paymentId: number) {
    return this.http.get(`${this.base}/api/pagamentos/${paymentId}/pagbank/status`);
  }
}
