import { Component, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { PreReservationService } from 'src/app/services/pre-reservation.service';
import { MensagemService, MensagemUsuario } from 'src/app/services/mensagem.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  [x: string]: any;
  menuOpen = false;
  avatarMenuOpen = false;
  isLoggedIn = false; // Verifica se o usuário está logado
  isClient = false;   // Verifica se o usuário é um cliente
  userName: string = ''; // Nome do usuário logado
  loginAsUser: boolean = false;
  notificationsOpen = false;
  unreadNotifications: MensagemUsuario[] = [];
  preReservaTimeLeft: string = '';
  isPreReservaExpired: boolean = false;
  userPhotoUrl: string | null = null;
  private authSubscription: Subscription = new Subscription(); // Subscription para escutar as mudanças
  private intervalId: any;
  private messagePollingId: any;
  private notifiedMessageIds: Set<number> = new Set<number>();

  constructor(
    private router: Router,
    private authService: AuthService,
    private preReservaService: PreReservationService,
    private elementRef: ElementRef, // Injetando ElementRef para detectar cliques fora
    private mensagemService: MensagemService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.authService.autoLogin();
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = !!user;
      if (user) {
        this.userName = user.nomeCompleto?.split(' ').slice(0, 2).join(' ') || '';
        this.isClient = user.isClient;
        this.loginAsUser = user.loginAsUser;
  this.userPhotoUrl = user.fotoDataUrl || (user.fotoBase64 ? 'data:image/png;base64,' + user.fotoBase64 : null);
        this.checkPreReservaTime();
        this.startMessagePolling();
      } else {
        this.userName = '';
        this.isClient = false;
        this.userPhotoUrl = localStorage.getItem('guestAvatarDataUrl');
        this.preReservaTimeLeft = '';
        this.notificationsOpen = false;
        this.unreadNotifications = [];
        this.notifiedMessageIds.clear();
        if (this.intervalId) clearInterval(this.intervalId);
        this.stopMessagePolling();
      }
    });

    this.preReservaService.preReservaChange$.subscribe(() => {
      this.checkPreReservaTime();
    });

    this.preReservaService.preReservaCancelled$.subscribe(() => {
      this.preReservaTimeLeft = '';
      this.isPreReservaExpired = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
    });

    // Interrompe contador quando o pagamento for concluído
    this.preReservaService.paymentCompleted$.subscribe(() => {
      this.preReservaTimeLeft = '';
      this.isPreReservaExpired = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
    });
  }

  startCountdown(expirationTime: number) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      const timeLeft = expirationTime - Date.now();
      if (timeLeft <= 0) {
        clearInterval(this.intervalId);
        this.preReservaTimeLeft = '';
      } else {
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        this.preReservaTimeLeft = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
      }
    }, 1000);
  }

  checkPreReservaTime() {
    const storedData = localStorage.getItem('preReservaData');
    if (storedData) {
      const preReservaData = JSON.parse(storedData);
      const expirationTime = preReservaData.timestamp + (10 * 60 * 1000); // Adiciona 10 minutos ao timestamp

      // Função para atualizar o tempo restante
      this.updateTimeLeft(expirationTime);
    } else {
      this.preReservaTimeLeft = ''; // Não exibe nada se não houver pré-reserva
    }
  }
  updateTimeLeft(expirationTime: number) {
    if (this.intervalId) {
      clearInterval(this.intervalId); // Garante que não há múltiplos intervalos
    }

    this.intervalId = setInterval(() => {
      const currentTime = new Date().getTime();
      const timeLeft = expirationTime - currentTime; // Calcula o tempo restante

      if (timeLeft <= 0) {
        this.isPreReservaExpired = true;
        clearInterval(this.intervalId); // Limpa o intervalo quando a pré-reserva expirar
        this.preReservaService.expirePreReservation();
        this.preReservaTimeLeft = ''; // <-- limpa o contador do header
      } else {
        const minutes = Math.floor(timeLeft / 60000); // Calcula os minutos restantes
        const seconds = Math.floor((timeLeft % 60000) / 1000); // Calcula os segundos restantes
        this.preReservaTimeLeft = `${minutes}m ${seconds}s`; // Atualiza a variável com o tempo restante
      }
    }, 1000); // Atualiza a cada segundo
  }


  // Alterna o estado do menu
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // Fecha o menu
  closeMenu() {
    this.menuOpen = false;
    this.avatarMenuOpen = false; // Opcional: Fecha também o menu do avatar
    this.notificationsOpen = false;
  }

  toggleAvatarMenu() {
    this.notificationsOpen = false;
    this.avatarMenuOpen = !this.avatarMenuOpen;
  }

  toggleNotifications(event: MouseEvent) {
    event.stopPropagation();
    this.avatarMenuOpen = false;
    this.notificationsOpen = !this.notificationsOpen;
  }

  openNotification(mensagem: MensagemUsuario) {
    this.notificationsOpen = false;
    this.router.navigate(['/notificacoes-usuario'], {
      state: { messageId: mensagem.id }
    });
  }

  goToNotificationsPage() {
    this.notificationsOpen = false;
    this.router.navigate(['/notificacoes-usuario']);
  }

  goToLogin() {
    this.avatarMenuOpen = false;
    this.router.navigate(['/login']);
  }

  goToProfile() {
    this.avatarMenuOpen = false;
    this.router.navigate(['/user-profile']);
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.isClient = false;
    this.userName = '';
    this.avatarMenuOpen = false;
    this.notificationsOpen = false;
    this.unreadNotifications = [];
    this.notifiedMessageIds.clear();
    this.preReservaTimeLeft = ''; // Limpa o contador visual
    this.isPreReservaExpired = false;
    if (this.intervalId) {
      clearInterval(this.intervalId); // Limpa o intervalo do timer
    }
    this.router.navigate(['/']);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollY = window.scrollY;
    const header = document.querySelector('header') as HTMLElement;

    if (scrollY > 50) {
      header.style.backgroundColor = 'rgba(0, 128, 128, 0.8)';
    } else {
      header.style.backgroundColor = 'linear-gradient(to right, rgb(43, 250, 185), rgb(0, 128, 128))';
    }
  }

  // Fechar menu ao clicar fora
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.closeMenu(); // Fecha o menu se o clique foi fora dele
      this.notificationsOpen = false;
    }
  }

  @HostListener('window:guest-avatar-updated', ['$event'])
  onGuestAvatarUpdated(event: CustomEvent<string>) {
    if (!this.isLoggedIn) {
      this.userPhotoUrl = event.detail || localStorage.getItem('guestAvatarDataUrl');
    }
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
    if (this.intervalId) {
      clearInterval(this.intervalId); // Limpa o intervalo ao destruir o componente
    }
    this.stopMessagePolling();
  }

  private startMessagePolling() {
    this.stopMessagePolling();
    this.checkUnreadMessages();
    this.messagePollingId = setInterval(() => this.checkUnreadMessages(), 10000);
  }

  private stopMessagePolling() {
    if (this.messagePollingId) {
      clearInterval(this.messagePollingId);
      this.messagePollingId = undefined;
    }
  }

  private checkUnreadMessages() {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      return;
    }

    this.mensagemService.listarMensagensDestinatario(user.id, true).subscribe({
      next: (mensagens) => {
        this.unreadNotifications = mensagens || [];

        this.unreadNotifications.forEach((mensagem) => {
          if (this.notifiedMessageIds.has(mensagem.id)) {
            return;
          }
          this.notifiedMessageIds.add(mensagem.id);
          const remetenteNome = mensagem.remetente?.nomeCompleto || mensagem.remetente?.email || 'Mensagem';
          this.snackBar.open(`Nova mensagem de ${remetenteNome}`, 'Ver', { duration: 5000 })
            .onAction()
            .subscribe(() => this.openNotification(mensagem));
        });
      },
      error: () => {
        // Evita ruído visual em falhas pontuais de rede.
      }
    });
  }

  closeModal() {
    this.isPreReservaExpired = false; // Fecha o modal
    this.router.navigate(['/pre-reserva']); // Navega para a página de pré-reserva
  }
}
