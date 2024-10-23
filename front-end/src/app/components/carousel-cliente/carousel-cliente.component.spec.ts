import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarouselClienteComponent } from './carousel-cliente.component';

describe('CarouselClienteComponent', () => {
  let component: CarouselClienteComponent;
  let fixture: ComponentFixture<CarouselClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CarouselClienteComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CarouselClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
