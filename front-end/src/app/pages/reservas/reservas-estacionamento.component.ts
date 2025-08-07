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
            // Filtra apenas pagamentos com status 'pago'
            this.reservas = reservas.filter(r => r.status && r.status.toLowerCase() === 'pago');
          });
        } else {
          this.reservas = [];
        }
      });
    }
  }
}
