import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ReservaService } from '../../services/reserva.service';
import { EstacionamentoService } from '../../services/estacionamento.service';

@Component({
  selector: 'app-reservas-estacionamento',
  templateUrl: './reservas-estacionamento.component.html',
  styleUrls: ['./reservas-estacionamento.component.scss']
})
export class ReservasEstacionamentoComponent implements OnInit {
  reservas: any[] = [];

  constructor(
    private authService: AuthService,
    private reservaService: ReservaService,
    private estacionamentoService: EstacionamentoService
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.getCurrentUser();
    if (usuario && usuario.perfil === 'cliente') {
      this.estacionamentoService.getEstacionamentoPorUsuarioId(usuario.id).subscribe((estacionamento: any) => {
        const filtrarExpiradas = (reservas: any[]) => {
          const agora = new Date();
          return reservas.filter(r => {
            if (!(r.status && r.status.toLowerCase() === 'pago')) return false;
            // Se não houver data/horário de saída, não expira
            if (!r.dataReservaEntrada || !r.horarioReservaSaida) return true;
            // Monta data/hora de saída
            const [ano, mes, dia] = (r.dataReservaEntrada.length === 10 ? r.dataReservaEntrada : r.dataReservaEntrada.substring(0,10)).split('-');
            const [hora, minuto, segundo] = (r.horarioReservaSaida || '00:00:00').split(':');
            const dataSaida = new Date(Number(ano), Number(mes)-1, Number(dia), Number(hora), Number(minuto), Number(segundo||0));
            return dataSaida > agora;
          });
        };
        if (estacionamento && estacionamento.nomeEmpresa) {
          // Se for dono de estacionamento, mostra reservas do estacionamento
          this.reservaService.getReservasPorEstacionamentoNome(estacionamento.nomeEmpresa).subscribe((reservas: any[]) => {
            this.reservas = filtrarExpiradas(reservas);
          });
        } else {
          // Se não for dono, mostra reservas do próprio cliente
          this.reservaService.getReservasPorCliente(usuario.id).subscribe((reservas: any[]) => {
            this.reservas = filtrarExpiradas(reservas);
          });
        }
      });
    }
  }
}
