import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MensagemService, MensagemUsuario } from 'src/app/services/mensagem.service';

@Component({
  selector: 'app-notificacoes-usuario',
  templateUrl: './notificacoes-usuario.component.html',
  styleUrls: ['./notificacoes-usuario.component.scss']
})
export class NotificacoesUsuarioComponent implements OnInit {
  mensagens: MensagemUsuario[] = [];
  loading = true;
  deletingIds = new Set<number>();
  error = '';
  highlightedMessageId: number | null = null;

  constructor(
    private authService: AuthService,
    private mensagemService: MensagemService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { messageId?: number } | undefined;
    this.highlightedMessageId = state?.messageId ?? null;
    this.carregarMensagens();
  }

  carregarMensagens(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.loading = false;
      this.error = 'Usuário não autenticado.';
      return;
    }

    this.mensagemService.listarMensagensDestinatario(currentUser.id, false).subscribe({
      next: (mensagens) => {
        this.mensagens = mensagens || [];
        this.loading = false;

        if (this.highlightedMessageId) {
          const found = this.mensagens.find(m => m.id === this.highlightedMessageId);
          if (found && !found.lida) {
            this.marcarComoLida(found);
          }
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Erro ao carregar notificações.';
      }
    });
  }

  marcarComoLida(mensagem: MensagemUsuario): void {
    if (mensagem.lida) {
      return;
    }

    this.mensagemService.marcarComoLida(mensagem.id).subscribe({
      next: () => {
        mensagem.lida = true;
      }
    });
  }

  podeResponder(mensagem: MensagemUsuario): boolean {
    return !!mensagem.remetente?.id && !!mensagem.remetente?.isClient;
  }

  responderMensagem(mensagem: MensagemUsuario, event: MouseEvent): void {
    event.stopPropagation();
    if (!mensagem.remetente?.id) {
      return;
    }

    this.marcarComoLida(mensagem);
    this.router.navigate(['/enviar-mensagem'], {
      state: {
        destinatarioId: mensagem.remetente.id,
        destinatarioNome: mensagem.remetente.nomeCompleto || mensagem.remetente.email || `Usuário #${mensagem.remetente.id}`,
        destinatarioEmail: mensagem.remetente.email || ''
      }
    });
  }

  excluirMensagem(mensagem: MensagemUsuario, event: MouseEvent): void {
    event.stopPropagation();
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id || this.deletingIds.has(mensagem.id)) {
      return;
    }

    this.deletingIds.add(mensagem.id);
    this.mensagemService.excluirMensagem(mensagem.id, currentUser.id).subscribe({
      next: () => {
        this.mensagens = this.mensagens.filter(m => m.id !== mensagem.id);
        this.deletingIds.delete(mensagem.id);
      },
      error: () => {
        this.deletingIds.delete(mensagem.id);
        this.error = 'Não foi possível excluir a mensagem.';
      }
    });
  }
}
