import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreReservaComponent } from './pre-reserva.component';

describe('PreReservaComponent', () => {
  let component: PreReservaComponent;
  let fixture: ComponentFixture<PreReservaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PreReservaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PreReservaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
