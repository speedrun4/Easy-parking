import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { EstacionamentoService } from 'src/app/services/estacionamento.service';

@Component({
  selector: 'app-meus-estacionamentos',
  templateUrl: './meus-estacionamentos.component.html',
  styleUrls: ['./meus-estacionamentos.component.scss']
})
export class MeusEstacionamentosComponent implements OnInit {
  meusEstacionamentos: any[] = [];
  loading = true;
  excluindoEstacionamentoId: number | null = null;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private estacionamentoService: EstacionamentoService
  ) {}

  ngOnInit(): void {
    this.carregarMeusEstacionamentos();
  }

  carregarMeusEstacionamentos(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.loading = false;
      this.errorMessage = 'Usuario nao autenticado.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.estacionamentoService.listarMeusEstacionamentos(currentUser.id).subscribe({
      next: (estacionamentos) => {
        this.meusEstacionamentos = estacionamentos || [];
        this.loading = false;
      },
      error: () => {
        this.meusEstacionamentos = [];
        this.loading = false;
        this.errorMessage = 'Nao foi possivel carregar seus estacionamentos.';
      }
    });
  }

  excluirEstacionamento(estacionamento: any): void {
    const currentUser = this.authService.getCurrentUser();
    const estacionamentoId = Number(estacionamento?.id);
    if (!currentUser?.id || !estacionamentoId) {
      return;
    }

    const nome = estacionamento?.nomeEmpresa || 'este estacionamento';
    const confirmar = window.confirm(`Deseja excluir ${nome}?`);
    if (!confirmar) {
      return;
    }

    this.excluindoEstacionamentoId = estacionamentoId;
    this.errorMessage = '';
    this.estacionamentoService.excluirEstacionamento(estacionamentoId, currentUser.id).subscribe({
      next: () => {
        this.meusEstacionamentos = this.meusEstacionamentos.filter((item) => Number(item?.id) !== estacionamentoId);
        this.excluindoEstacionamentoId = null;
      },
      error: () => {
        this.excluindoEstacionamentoId = null;
        this.errorMessage = 'Nao foi possivel excluir o estacionamento.';
      }
    });
  }
}
