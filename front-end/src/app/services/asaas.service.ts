import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface AsaasPurchaseRequest {
  method: 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD';
  amount: number; // in BRL
  description?: string;
  referenceId?: string;
  usuarioId?: number;
  card?: {
    number: string;
    exp_month: string;
    exp_year: string;
    security_code: string;
    holder: {
      name: string;
      tax_id?: string;
      email?: string;
      phone?: string;
      address?: string;
      address_number?: string;
      postal_code?: string;
      address_complement?: string;
    };
  };
}

export interface StripePaymentIntentRequest {
  amount: number;
  description?: string;
  customerName?: string;
  paymentMethod?: 'CREDIT_CARD' | 'DEBIT_CARD';
}

export interface StripePaymentIntentResponse {
  clientSecret: string;
  publicKey?: string;
  message?: string;
}

export interface StripePublicKeyResponse {
  publicKey: string;
}

@Injectable({ providedIn: 'root' })
export class AsaasService {
  private base = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  createPurchase(payload: AsaasPurchaseRequest) {
    return this.http.post(`${this.base}/api/asaas/purchase`, payload);
  }

  // For existing local Pagamentos entity (PIX)
  createPixForPayment(paymentId: number) {
    return this.http.post(`${this.base}/api/pagamentos/${paymentId}/asaas/pix`, {});
  }

  getPagBankStatus(paymentId: number) {
    return this.http.get(`${this.base}/api/pagamentos/${paymentId}/asaas/status`);
  }

  createStripePaymentIntent(payload: StripePaymentIntentRequest) {
    return this.http.post<StripePaymentIntentResponse>(`${this.base}/api/stripe/payment-intent`, payload);
  }

  getStripePublicKey() {
    return this.http.get<StripePublicKeyResponse>(`${this.base}/api/stripe/public-key`);
  }
}
