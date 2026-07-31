export interface PaymentHistory {
  id: number;
  status?: string;
  nome: string;
  formaPagamento: string;
  valorPago: number;
  horario: string;
  data: string;
  estacionamento: string;
  latitude: number;
  longitude: number;
  endereco: string;
  dataReservaEntrada?: string;
  horarioReservaEntrada?: string;
  horarioReservaSaida?: string;
}
