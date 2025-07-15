import { Component, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { PreReservationService } from 'src/app/services/pre-reservation.service';

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
  preReservaTimeLeft: string = '';
  isPreReservaExpired: boolean = false;
  private authSubscription: Subscription = new Subscription(); // Subscription para escutar as mudanças
  private intervalId: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    private preReservaService: PreReservationService,
    private elementRef: ElementRef // Injetando ElementRef para detectar cliques fora
  ) { }

  ngOnInit(): void {
    this.authService.autoLogin();
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = !!user;
      if (user) {
        this.userName = user.nomeCompleto?.split(' ').slice(0, 2).join(' ') || '';
        this.isClient = user.isClient;
        this.loginAsUser = user.loginAsUser;
        this.checkPreReservaTime(); // <-- Chame aqui, após login
      } else {
        this.userName = '';
        this.isClient = false;
        this.preReservaTimeLeft = ''; // Limpa a contagem se deslogar
        if (this.intervalId) clearInterval(this.intervalId);
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
        localStorage.removeItem('preReservaData'); // Remove os dados da pré-reserva
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
  }

  toggleAvatarMenu() {
    this.avatarMenuOpen = !this.avatarMenuOpen;
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
    }
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
    if (this.intervalId) {
      clearInterval(this.intervalId); // Limpa o intervalo ao destruir o componente
    }
  }

  closeModal() {
    this.isPreReservaExpired = false; // Fecha o modal
    this.router.navigate(['/pre-reserva']); // Navega para a página de pré-reserva
  }
}
