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
      phone: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.initializeParkingForm();
  }

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
      cnpj: this.parkingForm.get('cnpj')?.value,
      valorPorHora: this.parkingForm.get('hourlyRate')?.value,
      enderecoCompleto: this.parkingForm.get('address')?.value,
      cep: this.parkingForm.get('cep')?.value,
      cepFiliais: this.parkingForm.get('branchCeps')?.value,
      telefone: this.parkingForm.get('phone')?.value,
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
    this.parkingForm.get('cnpj')?.setValue(cnpj.replace(/\D/g, ''));
  }
}
