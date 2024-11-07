import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SucessoModalComponent } from './sucess-modal.component';




describe('SucessoModalComponent', () => {
  let component: SucessoModalComponent;
  let fixture: ComponentFixture<SucessoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SucessoModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SucessoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
