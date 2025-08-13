import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EstacionamentoService } from 'src/app/services/estacionamento.service';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { Router } from '@angular/router';
import { SucessoModalComponent } from 'src/app/components/sucess-modal/sucess-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-cadastro-estacionamento',
  templateUrl: './cadastro-estacionamento.component.html',
  styleUrls: ['./cadastro-estacionamento.component.scss']
})
export class CadastroEstacionamentoComponent implements OnInit {

  showUserForm = true; // Controle de qual formulário mostrar
  parkingForm!: FormGroup;
  mostrarModalSucesso = false;
  errorMessage: string = '';
  showErrorModal: boolean = false;


  constructor(
    private fb: FormBuilder,
    private estacionamentoService: EstacionamentoService,
    private geocodingService: GeocodingService,
    private router: Router,
    public dialog: MatDialog,
    private authService: AuthService
  ) {
    this.parkingForm = this.fb.group({
      companyName: ['', Validators.required],
      cnpj: ['', Validators.required],
      hourlyRate: ['', Validators.required],
      address: ['', Validators.required],
      cep: ['', Validators.required],
      branchCeps: [''],
      horarioAbertura: ['', Validators.required],
      horarioFechamento: ['', Validators.required],
      phone: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.initializeParkingForm();
  }

  initializeParkingForm() {
    this.parkingForm = this.fb.group({
      companyName: ['', Validators.required],
      cnpj: ['', [Validators.required, Validators.pattern(/^[\d]{14}$/)]],  // Aceita apenas 14 dígitos numéricos
      hourlyRate: ['', Validators.required],
      address: ['', Validators.required],
      cep: ['', Validators.required],
      branchCeps: ['', Validators.required],
      horarioAbertura: ['', Validators.required],
      horarioFechamento: ['', Validators.required],
      phone: ['', Validators.required]
    });
  }

  onParkingSubmit() {
    if (this.parkingForm.invalid) {
      return;  // Se o formulário estiver inválido, não faz nada
    }

    // Criação do objeto estacionamento com os dados do formulário
    // Obtém o usuário logado
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.errorMessage = 'Usuário não autenticado. Faça login para cadastrar um estacionamento.';
      this.showErrorModal = true;
      return;
    }

    const estacionamento = {
      nomeEmpresa: this.parkingForm.get('companyName')?.value,
      cnpj: this.parkingForm.get('cnpj')?.value.replace(/\D/g, ''),
      valorPorHora: this.parkingForm.get('hourlyRate')?.value.replace(/[^\d,]/g, '').replace(',', '.'),
      enderecoCompleto: this.parkingForm.get('address')?.value,
      cep: this.parkingForm.get('cep')?.value.replace(/\D/g, ''),
      cepFiliais: this.parkingForm.get('branchCeps')?.value,
      horarioAbertura: this.parkingForm.get('horarioAbertura')?.value,
      horarioFechamento: this.parkingForm.get('horarioFechamento')?.value,
      telefone: this.parkingForm.get('phone')?.value.replace(/\D/g, ''),
      usuarioId: currentUser.id // Vínculo com usuário logado
    };

    // Chama o serviço para fazer a requisição POST para a API
    this.estacionamentoService.salvarEstacionamento(estacionamento).subscribe({
      next: (response) => {
        console.log('Cadastro realizado com sucesso!', response);
        this.openSuccessModal();
        this.router.navigate(['/cliente']);  // Redireciona para uma página de sucesso, caso queira
      },
      error: (err) => {
        alert('Erro ao cadastrar estacionamento!');
      }
    });
  }
  openSuccessModal(): void {
    console.log("Abrindo modal de sucesso");
    this.dialog.open(SucessoModalComponent, {
      width: '200px',  // Define o tamanho do modal
      data: { message: 'Estacionamento cadastrado com sucesso!' }  // Passa a mensagem para o modal
    });
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
    this.parkingForm.get('cnpj')?.setValue(cnpj);
  }

  onPhoneInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let phone = inputElement.value.replace(/\D/g, ''); // Remove tudo que não for número

    // Limita a 11 dígitos
    if (phone.length > 11) {
      phone = phone.substring(0, 11);
    }

    // Aplica a máscara: (99) 99999-9999 ou (99) 9999-9999
    if (phone.length > 10) {
      phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (phone.length > 6) {
      phone = phone.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3');
    } else if (phone.length > 2) {
      phone = phone.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }

    inputElement.value = phone;
    this.parkingForm.get('phone')?.setValue(phone);
  }

  onCepInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let cep = inputElement.value.replace(/\D/g, '');
    if (cep.length > 8) {
      cep = cep.substring(0, 8);
    }
    if (cep.length > 5) {
      cep = cep.replace(/(\d{5})(\d{0,3})/, '$1-$2');
    }
    inputElement.value = cep;
    this.parkingForm.get('cep')?.setValue(cep);
  }

  onHourlyRateInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value.replace(/\D/g, '');
    if (value.length === 0) {
      inputElement.value = '';
      this.parkingForm.get('hourlyRate')?.setValue('');
      return;
    }
    value = (parseInt(value, 10) / 100).toFixed(2);
    const formatted = value.replace('.', ',');
    inputElement.value = 'R$ ' + formatted;
    this.parkingForm.get('hourlyRate')?.setValue(formatted);
  }
}
