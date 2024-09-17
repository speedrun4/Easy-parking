import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.scss']
})
export class CadastroComponent implements OnInit {

  showUserForm = true; // Controle de qual formulário mostrar
  userForm!: FormGroup;
  parkingForm!: FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.initializeUserForm();
    this.initializeParkingForm();
  }

  initializeUserForm() {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,11}$/)
        ]
      ],
      cpf: ['', Validators.required]
    });
  }

  initializeParkingForm() {
    this.parkingForm = this.fb.group({
      companyName: ['', Validators.required],
      cnpj: ['', Validators.required],
      hourlyRate: ['', Validators.required],
      address: ['', Validators.required],
      cep: ['', Validators.required],
      branchCeps: ['', Validators.required],
      phone: ['', Validators.required]
    });
  }

  onUserSubmit() {
    if (this.userForm.valid) {
      // Lógica para envio do formulário de usuário
      console.log('Formulário de usuário enviado', this.userForm.value);
    }
  }

  onParkingSubmit() {
    if (this.parkingForm.valid) {
      // Lógica para envio do formulário de estacionamento
      console.log('Formulário de estacionamento enviado', this.parkingForm.value);
    }
  }
}
