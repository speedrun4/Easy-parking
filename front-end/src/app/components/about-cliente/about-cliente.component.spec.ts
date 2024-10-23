import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutClienteComponent } from './about-cliente.component';

describe('AboutClienteComponent', () => {
  let component: AboutClienteComponent;
  let fixture: ComponentFixture<AboutClienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AboutClienteComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AboutClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
