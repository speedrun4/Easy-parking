export interface Carteira {
    saldo: number;
    historicoTransacoes: Transacao[];
  }
  
  export interface Transacao {
    tipo: 'entrada' | 'saida';
    valor: number;
    descricao: string;
    data: Date;
  }
  