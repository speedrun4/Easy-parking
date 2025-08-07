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
        if (estacionamento && estacionamento.nomeEmpresa) {
          this.reservaService.getReservasPorEstacionamentoNome(estacionamento.nomeEmpresa).subscribe((reservas: any[]) => {
            console.log('Reservas recebidas do backend:', reservas);
            // Exibe todas as reservas com status 'pago', independente do horário
            this.reservas = reservas.filter(r => r.status && r.status.toLowerCase() === 'pago');
            console.log('Reservas após filtro de status e horário:', this.reservas);
          });
        } else {
          this.reservas = [];
        }
      });
    }
  }
}
