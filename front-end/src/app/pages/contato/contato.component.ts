import { Component } from '@angular/core';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-contato',
  templateUrl: './contato.component.html',
  styleUrls: ['./contato.component.scss']
})
export class ContatoComponent {

  faArrowLeft = faArrowLeft;
  enviarFormulario() {
    // Lógica para enviar os dados do formulário
    console.log('Formulário enviado com sucesso!');
  }
}
