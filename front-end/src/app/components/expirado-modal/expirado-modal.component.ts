import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-expirado-modal',
  templateUrl: './expirado-modal.component.html',
  styleUrls: ['./expirado-modal.component.scss']
})
export class ExpiradoModalComponent {
  @Input() isVisible: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  close() {
    this.closeModal.emit(); // Emite um evento para fechar o modal
  }
}
