import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertDialogCancelComponent } from './alert-dialog-cancel.component';

describe('AlertDialogCancelComponent', () => {
  let component: AlertDialogCancelComponent;
  let fixture: ComponentFixture<AlertDialogCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlertDialogCancelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertDialogCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
