
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Carteira } from 'src/app/models/carteira.model';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';


export interface Transacao {
  data: Date;
  descricao: string;
  valor: number;
  tipo: "entrada" | "saida"; // tipo restrito
}

@Injectable({
  providedIn: 'root'
})

export class CarteiraService {
  private apiUrl = `${environment.apiBaseUrl}/api/carteira`;
  private carteira: Carteira = { saldo: 0, historicoTransacoes: [] };

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getUsuarioId(): number | null {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id || null;
  }

  // Retorna o último snapshot carregado da carteira (usar carregarCarteira() para atualizar do backend)
  obterCarteira(): Carteira {
    return this.carteira;
  }

  // Busca saldo e histórico persistidos no backend para o usuário logado
  carregarCarteira(): Observable<Carteira> {
    const usuarioId = this.getUsuarioId();
    return new Observable<Carteira>(observer => {
      if (!usuarioId) {
        observer.next(this.carteira);
        observer.complete();
        return;
      }

      this.http.get<any>(`${this.apiUrl}/${usuarioId}`).subscribe({
        next: (res) => {
          this.carteira = this.mapResponse(res);
          observer.next(this.carteira);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  private mapResponse(res: any): Carteira {
    const historico: Transacao[] = (res?.historicoTransacoes || []).map((t: any) => ({
      data: new Date(t.data),
      descricao: t.descricao,
      valor: t.tipo === 'entrada' ? t.valorAdicionado : t.valorRetirado,
      tipo: t.tipo
    }));
    return {
      saldo: res?.saldo || 0,
      historicoTransacoes: historico
    };
  }

  adicionarValor(valor: number, descricao: string, metodo: string): Observable<Carteira> {
    const usuarioId = this.getUsuarioId();
    return new Observable<Carteira>(observer => {
      if (!usuarioId) {
        observer.error('Usuário não autenticado.');
        return;
      }

      this.http.post<any>(`${this.apiUrl}/${usuarioId}/adicionar`, { valor, descricao, metodo }).subscribe({
        next: (res) => {
          this.carteira = this.mapResponse(res);
          observer.next(this.carteira);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  removerValor(valor: number, descricao: string): Observable<Carteira> {
    const usuarioId = this.getUsuarioId();
    return new Observable<Carteira>(observer => {
      if (!usuarioId) {
        observer.error('Usuário não autenticado.');
        return;
      }

      this.http.post<any>(`${this.apiUrl}/${usuarioId}/remover`, { valor, descricao }).subscribe({
        next: (res) => {
          this.carteira = this.mapResponse(res);
          observer.next(this.carteira);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  temSaldoSuficiente(valor: number): boolean {
    return this.carteira.saldo >= (Number(valor) || 0);
  }

  // Mantido síncrono para não quebrar chamadas existentes: debita localmente e persiste em segundo plano.
  removerValorSePossivel(valor: number, descricao: string): boolean {
    if (!this.temSaldoSuficiente(valor)) {
      return false;
    }

    this.removerValor(valor, descricao).subscribe({
      error: (err) => console.error('Erro ao persistir débito da carteira:', err)
    });
    return true;
  }
}
