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
        // Oculta o header tanto na rota inicial quanto na splash
        this.isSplashScreenActive = this.router.url === '/splash' || this.router.url === '/' || this.router.url === '';
      }
    });
  }
}
