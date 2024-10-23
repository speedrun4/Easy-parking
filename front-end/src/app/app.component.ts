import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isSplashScreenActive = true; // Inicialmente, a tela de splash está ativa

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        // Verifica se a navegação é para a página splash
        this.isSplashScreenActive = this.router.url === '/splash';
      }
    });
  }
}
