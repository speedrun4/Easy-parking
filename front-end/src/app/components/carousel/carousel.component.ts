import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss']
})
export class CarouselComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  goToAdvancePromoLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: '/welcome',
        promo: 'advance-24h-5',
        loginType: 'user'
      }
    });
  }

}
