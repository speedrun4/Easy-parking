import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MensagemService } from 'src/app/services/mensagem.service';
import { ReservaService } from 'src/app/services/reserva.service';

@Component({
  selector: 'app-enviar-mensagem',
  templateUrl: './enviar-mensagem.component.html',
  styleUrls: ['./enviar-mensagem.component.scss']
})
export class EnviarMensagemComponent implements OnInit {
  usuariosDestino: Array<{ id: number; nome: string; email?: string }> = [];
  destinatarioId: number | null = null;
  destinatarioFixado = false;
  conteudo = '';
  loading = true;
  sending = false;
  status = '';
  error = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private reservaService: ReservaService,
    private mensagemService: MensagemService
  ) {}

  ngOnInit(): void {
    this.aplicarDestinatarioDoEstado();
    this.carregarUsuariosDosMeusEstacionamentos();
  }

  private aplicarDestinatarioDoEstado(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as {
      destinatarioId?: number;
      destinatarioNome?: string;
      destinatarioEmail?: string;
    } | undefined;

    if (!state?.destinatarioId) {
      return;
    }

    const id = Number(state.destinatarioId);
    if (!id) {
      return;
    }

    this.destinatarioFixado = true;
    this.destinatarioId = id;
    this.usuariosDestino = [{
      id,
      nome: state.destinatarioNome || `Usuário #${id}`,
      email: state.destinatarioEmail || ''
    }];
  }

  carregarUsuariosDosMeusEstacionamentos(): void {
    if (this.destinatarioFixado) {
      this.loading = false;
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.loading = false;
      this.error = 'Usuário não autenticado.';
      return;
    }

    this.reservaService.getReservasDosMeusEstacionamentos(currentUser.id).subscribe({
      next: (reservas: any[]) => {
        const mapa = new Map<number, { id: number; nome: string; email?: string }>();
        (reservas || []).forEach((r) => {
          const id = r?.usuario?.id;
          if (!id) return;
          if (!mapa.has(id)) {
            mapa.set(id, {
              id,
              nome: r?.usuario?.nomeCompleto || r?.usuario?.nome || `Usuário #${id}`,
              email: r?.usuario?.email || ''
            });
          }
        });

        this.usuariosDestino = Array.from(mapa.values());
        if (this.usuariosDestino.length > 0) {
          this.destinatarioId = this.usuariosDestino[0].id;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Erro ao carregar usuários das reservas.';
      }
    });
  }

  enviar(): void {
    this.status = '';
    this.error = '';

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.error = 'Usuário não autenticado.';
      return;
    }
    if (!this.destinatarioId) {
      this.error = 'Selecione um usuário para enviar a mensagem.';
      return;
    }
    const texto = (this.conteudo || '').trim();
    if (!texto) {
      this.error = 'Digite a mensagem.';
      return;
    }

    this.sending = true;
    this.mensagemService.enviarMensagem(currentUser.id, this.destinatarioId, texto).subscribe({
      next: () => {
        this.sending = false;
        this.conteudo = '';
        this.status = 'Mensagem enviada com sucesso.';

        if (this.destinatarioFixado) {
          this.router.navigate(['/notificacoes-usuario']);
        }
      },
      error: () => {
        this.sending = false;
        this.error = 'Falha ao enviar mensagem.';
      }
    });
  }
}
