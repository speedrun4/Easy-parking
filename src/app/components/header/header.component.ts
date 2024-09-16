import { Component, HostListener, OnInit } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
    menuOpen = false;

    toggleMenu() {
      this.menuOpen = !this.menuOpen;
    }

    closeMenu() {
      this.menuOpen = false;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
      const clickedInsideMenu = (event.target as HTMLElement).closest('.menu-list');
      const clickedInsideButton = (event.target as HTMLElement).closest('.hamburger-menu');

      if (!clickedInsideMenu && !clickedInsideButton) {
        this.closeMenu(); // Fechar o menu se clicar fora
      }
    }

  constructor() { }

  ngOnInit(): void {
  }

}
