import { Component, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen = false;
  avatarMenuOpen = false;
  isLoggedIn = false; // Verifica se o usuário está logado
  isClient = false;   // Verifica se o usuário é um cliente
  userName: string = ''; // Nome do usuário logado
  loginAsUser: boolean = false;
  private authSubscription: Subscription = new Subscription(); // Subscription para escutar as mudanças

  constructor(
    private router: Router,
    private authService: AuthService,
    private elementRef: ElementRef // Injetando ElementRef para detectar cliques fora
  ) {}

  ngOnInit(): void {
    this.authService.autoLogin();
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = !!user;
      if (user) {
        this.userName = user.nomeCompleto?.split(' ').slice(0, 2).join(' ') || '';
        this.isClient = user.isClient; // Perfil cliente
        this.loginAsUser = user.loginAsUser; // Tipo de login realizado
      } else {
        this.userName = '';
        this.isClient = false;
      }
    });
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
    this.router.navigate(['/perfil']);
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn = false;
    this.isClient = false;
    this.userName = '';
    this.avatarMenuOpen = false;
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
  }
}
