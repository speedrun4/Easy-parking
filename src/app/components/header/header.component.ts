import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  menuOpen = false; // Estado do menu: aberto ou fechado

  constructor() {}

  ngOnInit(): void {
    // Inicialização do componente, se necessário
  }

  // Alterna o estado do menu
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  // Fecha o menu
  closeMenu() {
    this.menuOpen = false;
  }

  // Fecha o menu se clicar fora dele ou do botão do menu
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInsideMenu = (event.target as HTMLElement).closest(
      '.menu-list'
    );
    const clickedInsideButton = (event.target as HTMLElement).closest(
      '.hamburger-menu'
    );

    if (!clickedInsideMenu && !clickedInsideButton) {
      this.closeMenu();
    }
  }
}
