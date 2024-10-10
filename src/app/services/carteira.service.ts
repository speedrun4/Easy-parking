import { Injectable } from '@angular/core';
import { Carteira, Transacao } from '../models/carteira.model';

@Injectable({
  providedIn: 'root'
})
export class CarteiraService {
  private carteira: Carteira = {
    saldo: 1000,  // Saldo inicial, por exemplo
    historicoTransacoes: []
  };

  constructor() { }

  obterCarteira(): Carteira {
    return this.carteira;
  }

  adicionarValor(valor: number, descricao: string) {
    const transacao: Transacao = {
      tipo: 'entrada',
      valor: valor,
      descricao: descricao,
      data: new Date()
    };
    this.carteira.saldo += valor;
    this.carteira.historicoTransacoes.push(transacao);
  }

  removerValor(valor: number, descricao: string) {
    const transacao: Transacao = {
      tipo: 'saida',
      valor: valor,
      descricao: descricao,
      data: new Date()
    };
    this.carteira.saldo -= valor;
    this.carteira.historicoTransacoes.push(transacao);
  }
}
