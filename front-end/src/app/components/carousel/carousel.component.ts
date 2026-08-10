import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss']
})
export class CarouselComponent implements OnInit {
  private readonly advancePromoCode = 'advance-24h-5';
  private readonly firstReservationPromoCode = 'first-reservation-10';

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  goToAdvancePromoLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: '/welcome',
        promo: this.advancePromoCode,
        loginType: 'user'
      }
    });
  }

  goToFirstReservationPromoLogin(): void {
    this.router.navigate(['/cadastro'], {
      queryParams: {
        promo: this.firstReservationPromoCode,
        loginType: 'user'
      }
    });
  }

}
