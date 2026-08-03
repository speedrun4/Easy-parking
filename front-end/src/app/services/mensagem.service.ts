import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MensagemUsuario {
  id: number;
  conteudo: string;
  lida: boolean;
  criadaEm: string;
  remetente?: { id: number; nomeCompleto?: string; email?: string; isClient?: boolean };
  destinatario?: { id: number; nomeCompleto?: string; email?: string; isClient?: boolean };
}

@Injectable({ providedIn: 'root' })
export class MensagemService {
  private baseUrl = `${environment.apiBaseUrl}/api/mensagens`;

  constructor(private http: HttpClient) {}

  enviarMensagem(remetenteId: number, destinatarioId: number, conteudo: string) {
    return this.http.post(this.baseUrl, { remetenteId, destinatarioId, conteudo });
  }

  listarMensagensDestinatario(destinatarioId: number, apenasNaoLidas = false): Observable<MensagemUsuario[]> {
    return this.http.get<MensagemUsuario[]>(`${this.baseUrl}/destinatario/${destinatarioId}?apenasNaoLidas=${apenasNaoLidas}`);
  }

  marcarComoLida(mensagemId: number) {
    return this.http.put(`${this.baseUrl}/${mensagemId}/marcar-lida`, {});
  }

  excluirMensagem(mensagemId: number, destinatarioId: number) {
    return this.http.delete(`${this.baseUrl}/${mensagemId}?destinatarioId=${destinatarioId}`);
  }
}
