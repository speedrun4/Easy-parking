import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private apiUrl = 'http://localhost:8080/api/reservas';

  constructor(private http: HttpClient) {}

  criarReserva(reserva: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, reserva);
  }

  getReservasPorEstacionamentoNome(estacionamentoNome: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8080/api/pagamentos/estacionamento/${encodeURIComponent(estacionamentoNome)}`);
  }
}
