import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface QrCodesResponse {
  entry: { token: string; imageBase64: string; status: string } | null;
  exit: { token: string; imageBase64: string; status: string } | null;
}

@Injectable({ providedIn: 'root' })
export class QrCodeService {
  private baseUrl = 'http://localhost:8080/api/pagamentos';

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
}
