

export interface Cliente {
    id?: number; 
    nome_empresa: string;
    cnpj: string;
    valorPorHora: number;
    enderecoCompleto: string;
    cep: string;
    cepFiliais: string;
    telefone: string;
    latitude?: number; 
    longitude?: number; 
  }
  