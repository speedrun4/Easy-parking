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
      this.isLoggedIn = !!user;
      this.userName = user?.name || '';
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInsideMenu = (event.target as HTMLElement).closest('.menu-list');
    const clickedInsideButton = (event.target as HTMLElement).closest('.hamburger-menu');

    if (!clickedInsideMenu && !clickedInsideButton) {
      this.closeMenu();
    }
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe(); // Evitar memory leaks
  }
}
