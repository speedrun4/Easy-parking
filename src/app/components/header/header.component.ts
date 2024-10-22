import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  menuOpen = false;
  avatarMenuOpen = false;
  isLoggedIn = false; // Verifica se o usuário está logado
  userName: string = ''; // Nome do usuário logado
  private authSubscription: Subscription = new Subscription(); // Subscription para escutar as mudanças

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // Subscrição para detectar mudanças no estado de autenticação
    this.authSubscription = this.authService.currentUser.subscribe(user => {
      this.isLoggedIn = !!user; // Atualiza o estado se o usuário está logado
      if (user) {
        const nomeCompleto = user.nomeCompleto || ''; // Pega o nome completo do usuário
        const nomeDividido = nomeCompleto.split(' '); // Divide o nome completo
        this.userName = nomeDividido.slice(0, 2).join(' '); // Mostra apenas o primeiro e segundo nome
      } else {
        this.userName = ''; // Caso deslogado, limpa o nome
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
  }

  toggleAvatarMenu() {
    this.avatarMenuOpen = !this.avatarMenuOpen;
  }

  goToLogin() {
    this.avatarMenuOpen = false; // Fecha o dropdown
    this.router.navigate(['/login']);
  }

  goToProfile() {
    this.avatarMenuOpen = false; // Fecha o dropdown
    this.router.navigate(['/perfil']);
  }

  // Função de logout com redirecionamento para a página inicial
  logout() {
    this.authService.logout(); // Remove o usuário do localStorage e do serviço
    this.isLoggedIn = false;
    this.userName = '';
    this.avatarMenuOpen = false; // Fecha o dropdown do avatar
    this.router.navigate(['/']); // Redireciona para a página inicial (home)
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollY = window.scrollY;
    const header = document.querySelector('header') as HTMLElement;

    if (scrollY > 50) {
      header.style.backgroundColor = 'rgba(0, 128, 128, 0.8)'; // Por exemplo, uma cor de fundo diferente
    } else {
      header.style.backgroundColor = 'linear-gradient(to right, rgb(43, 250, 185), rgb(0, 128, 128))'; // Cor original
    }
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe(); // Evitar memory leaks
  }
}
