import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QrCodesResponse {
  entry: { token: string; imageBase64: string; status: string } | null;
  exit: { token: string; imageBase64: string; status: string } | null;
}

@Injectable({ providedIn: 'root' })
export class QrCodeService {
  private baseUrl = `${environment.apiBaseUrl}/api/pagamentos`;

  constructor(private http: HttpClient) {}

  getByPaymentId(id: number): Observable<QrCodesResponse> {
    return this.http.get<QrCodesResponse>(`${this.baseUrl}/${id}/qrcodes`);
  }

  consume(id: number, type: 'entry' | 'exit') {
    return this.http.post(`${this.baseUrl}/${id}/qrcodes/consume?type=${type}`, {});
  }

  getLastByUser(userId: number): Observable<QrCodesResponse & { paymentId: number }> {
    return this.http.get<QrCodesResponse & { paymentId: number }>(`${this.baseUrl}/ultimo-qrcodes?usuarioId=${userId}`);
  }

  consumeByToken(token: string) {
    return this.http.post(`${this.baseUrl}/qrcodes/consume-by-token?token=${encodeURIComponent(token)}`, {});
  }
}
