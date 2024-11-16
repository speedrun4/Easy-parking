
import { Injectable } from '@angular/core';
import { Carteira } from 'src/app/models/carteira.model';


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
  private carteira: Carteira = { saldo: 0, historicoTransacoes: [] }; // Simulação inicial

  obterCarteira(): Carteira {
    return this.carteira;
  }

  adicionarValor(valor: number, descricao: string, metodo: string,): void {
    const transacao: Transacao = {
      data: new Date(),
      descricao,
      valor,
      tipo: "entrada",
    };

    this.carteira.saldo += valor;
    this.carteira.historicoTransacoes.push(transacao);

    // Simule um salvamento na base de dados aqui
    console.log('Transação salva:', transacao);
  }

  removerValor(valor: number, descricao: string): void {
    const transacao: Transacao = {
      data: new Date(),
      descricao,
      valor,
      tipo: "saida"
    };

    this.carteira.saldo -= valor;
    this.carteira.historicoTransacoes.push(transacao);

    // Simule um salvamento na base de dados aqui
    console.log('Transação salva:', transacao);
  }
}
