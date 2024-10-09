import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { GeocodingService } from '../../services/geocoding.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.scss']
})
export class CadastroComponent implements OnInit {

  showUserForm = true; // Controle de qual formulário mostrar
  userForm!: FormGroup;
  parkingForm!: FormGroup;
  estacionamentos: any[] = [];
  mostrarModalSucesso = false;

  constructor(private fb: FormBuilder,
    private estacionamentoService: EstacionamentoService,
    private geocodingService: GeocodingService,
    private router: Router) { }

  ngOnInit(): void {
    this.initializeUserForm();
    this.initializeParkingForm();
    const estacionamentosSalvos = this.carregarEstacionamentos();
    console.log('Estacionamentos salvos:', estacionamentosSalvos);
  }

  // Inicializa o formulário de usuário com validações
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
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],  // Aceita apenas 11 dígitos numéricos
    });
  }

  // Inicializa o formulário de estacionamento com validações
  initializeParkingForm() {
    this.parkingForm = this.fb.group({
      companyName: ['', Validators.required],
      cnpj: ['', [Validators.required, Validators.pattern(/^\d{14}$/)]],  // Aceita apenas 14 dígitos numéricos
      hourlyRate: ['', Validators.required],
      address: ['', Validators.required],
      cep: ['', Validators.required],
      branchCeps: ['', Validators.required],
      phone: ['', Validators.required]
    });
  }


  onUserSubmit() {
    if (this.userForm.valid) {
      console.log('Formulário de usuário enviado', this.userForm.value);
    }
  }

  onParkingSubmit() {
    if (this.parkingForm.valid) {
      const address = this.parkingForm.get('address')?.value;

      // Use o serviço de geocodificação para obter latitude e longitude
      this.geocodingService.getCoordinates(address).subscribe(coordinates => {
        if (coordinates) {
          const estacionamento = {
            ...this.parkingForm.value,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude
          };

          // Salvar no localStorage
          this.salvarEstacionamento(estacionamento);

          console.log('Estacionamento cadastrado e salvo localmente', estacionamento);

          this.mostrarModalSucesso = true;

          setTimeout(() => {
            this.mostrarModalSucesso = false;
            this.router.navigate(['/home']);  // Redireciona para a página Home
          }, 2000);
          // Redirecionar para a página home após salvar
          this.router.navigate(['/home']);  // Redireciona para a página Home
        } else {
          console.error('Endereço inválido');
        }
      });
    }
  }

  carregarEstacionamentos() {
    const estacionamentos = JSON.parse(localStorage.getItem('estacionamentos') || '[]');
    return estacionamentos;
  }
  salvarEstacionamento(estacionamento: any) {
    let estacionamentos = JSON.parse(localStorage.getItem('estacionamentos') || '[]');
    estacionamentos.push(estacionamento);
    localStorage.setItem('estacionamentos', JSON.stringify(estacionamentos));
  }

  onCpfInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let cpf = inputElement.value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos

    // Limita a 11 dígitos
    if (cpf.length > 11) {
      cpf = cpf.substring(0, 11);
    }

    // Aplica a máscara CPF: XXX.XXX.XXX-XX
    if (cpf.length > 9) {
      cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cpf.length > 6) {
      cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (cpf.length > 3) {
      cpf = cpf.replace(/(\d{3})(\d{3})/, '$1.$2');
    } else {
      cpf = cpf.replace(/(\d{3})/, '$1');
    }

    // Atualiza o valor do campo com a máscara aplicada
    inputElement.value = cpf;

    // Atualiza o valor do formulário com o CPF sem a máscara (só números)
    this.userForm.get('cpf')?.setValue(cpf.replace(/\D/g, ''));
  }

  onCnpjInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let cnpj = inputElement.value.replace(/\D/g, ''); // Remove todos os caracteres não numéricos

    // Limita a 14 dígitos
    if (cnpj.length > 14) {
      cnpj = cnpj.substring(0, 14);
    }

    // Aplica a máscara CNPJ: XX.XXX.XXX/XXXX-XX
    if (cnpj.length > 12) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else if (cnpj.length > 8) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4');
    } else if (cnpj.length > 5) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (cnpj.length > 2) {
      cnpj = cnpj.replace(/(\d{2})(\d{3})/, '$1.$2');
    }

    // Atualiza o valor do campo com a máscara aplicada
    inputElement.value = cnpj;

    // Atualiza o valor do formulário com o CNPJ sem a máscara (só números)
    this.parkingForm.get('cnpj')?.setValue(cnpj.replace(/\D/g, ''));
  }
}
