import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ReservaService } from '../../services/reserva.service';

@Component({
  selector: 'app-reservas-estacionamento',
  templateUrl: './reservas-estacionamento.component.html',
  styleUrls: ['./reservas-estacionamento.component.scss']
})
export class ReservasEstacionamentoComponent implements OnInit {
  reservas: any[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private reservaService: ReservaService
  ) {}

  ngOnInit(): void {
    const usuario = this.authService.getCurrentUser();
    if (!usuario?.id) {
      this.loading = false;
      this.errorMessage = 'Usuário não autenticado.';
      return;
    }

    this.reservaService.getReservasDosMeusEstacionamentos(usuario.id).subscribe({
      next: (reservas: any[]) => {
        this.reservas = (reservas || []).sort((a, b) => (b.id || 0) - (a.id || 0));
        this.loading = false;
        if (this.reservas.length === 0) {
          this.errorMessage = '';
        }
      },
      error: () => {
        this.reservas = [];
        this.loading = false;
        this.errorMessage = 'Erro ao carregar reservas dos seus estacionamentos.';
      }
    });
  }
}
