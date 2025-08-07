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
            // Filtra apenas pagamentos com status 'pago' e que ainda não passaram do horário de término
            const now = new Date();
            this.reservas = reservas.filter(r => {
              if (!(r.status && r.status.toLowerCase() === 'pago')) return false;
              // Considera que r.data é a data da reserva e r.horario é o horário de término
              if (!r.data || !r.horario) return true; // Se não houver data/horário, exibe por padrão
              const dataStr = typeof r.data === 'string' ? r.data : '';
              const horarioStr = typeof r.horario === 'string' ? r.horario : '';
              // Monta um Date com data e horário
              const [ano, mes, dia] = dataStr.split('-').map(Number);
              const [hora, minuto, segundo] = horarioStr.split(':').map(Number);
              if (!ano || !mes || !dia || isNaN(hora)) return true;
              const fimReserva = new Date(ano, mes - 1, dia, hora || 0, minuto || 0, segundo || 0);
              return fimReserva > now;
            });
          });
        } else {
          this.reservas = [];
        }
      });
    }
  }
}
