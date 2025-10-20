import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { EstacionamentoService } from 'src/app/services/estacionamento.service';
import { GeocodingService } from 'src/app/services/geocoding.service';
import { Router } from '@angular/router';
import { SucessoModalComponent } from 'src/app/components/sucess-modal/sucess-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from 'src/app/services/auth.service';

// ---------- Validator: CNPJ (top-level) ----------
export function cnpjValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = (control.value || '').toString();
  const cnpj = value.replace(/\D/g, '');
  if (!cnpj || cnpj.length !== 14) {
    return { cnpjInvalid: true };
  }

  // Rejeita sequências repetidas (ex.: 000... ou 111...)
  if (/^(\d)\1{13}$/.test(cnpj)) {
    return { cnpjInvalid: true };
  }

  const calcCheckDigit = (base: string, weights: number[]): number => {
    const sum = base.split('').reduce((acc, digit, idx) => acc + parseInt(digit, 10) * weights[idx], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base12 = cnpj.substring(0, 12);
  const d1 = calcCheckDigit(base12, [5,4,3,2,9,8,7,6,5,4,3,2]);
  const base13 = base12 + d1.toString();
  const d2 = calcCheckDigit(base13, [6,5,4,3,2,9,8,7,6,5,4,3,2]);

  const expected = d1.toString() + d2.toString();
  const actual = cnpj.substring(12);
  return actual === expected ? null : { cnpjInvalid: true };
}

// ---------- Validator: CEP (8 dígitos) ----------
export function cepValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = (control.value || '').toString();
  const cep = value.replace(/\D/g, '');
  return cep.length === 8 ? null : { cepInvalid: true };
}

// ---------- Validator: Telefone (10 ou 11 dígitos) ----------
export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const value: string = (control.value || '').toString();
  const digits = value.replace(/\D/g, '');
  return (digits.length === 10 || digits.length === 11) ? null : { phoneInvalid: true };
}

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
      cnpj: ['', [Validators.required, cnpjValidator]],  // Validação de CNPJ com dígitos verificadores
      hourlyRate: ['', Validators.required],
      address: ['', Validators.required],
      cep: ['', [Validators.required, cepValidator]],
      branchCeps: ['', Validators.required],
      horarioAbertura: ['', Validators.required],
      horarioFechamento: ['', Validators.required],
      phone: ['', [Validators.required, phoneValidator]]
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
    // Posição do caret antes da formatação
    const prevMasked = inputElement.value;
    const prevCaret = inputElement.selectionStart ?? prevMasked.length;
    const digitsBeforeCaret = (prevMasked.slice(0, prevCaret).match(/\d/g) || []).length;

    // Valor bruto (apenas dígitos)
    let raw = prevMasked.replace(/\D/g, '');

    // Limita a 14 dígitos
    if (raw.length > 14) {
      raw = raw.substring(0, 14);
    }

    // Monta a máscara para exibição a partir do valor bruto
    let masked = raw;
    if (raw.length > 12) {
      masked = raw.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else if (raw.length > 8) {
      masked = raw.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, (m, a, b, c, d) => `${a}.${b}.${c}/${d}`);
    } else if (raw.length > 5) {
      masked = raw.replace(/(\d{2})(\d{3})(\d{0,3})/, (m, a, b, c) => `${a}.${b}.${c}`);
    } else if (raw.length > 2) {
      masked = raw.replace(/(\d{2})(\d{0,3})/, (m, a, b) => `${a}.${b}`);
    }

    // Exibe a máscara no input
    inputElement.value = masked;

    // Calcula nova posição do caret mantendo a mesma quantidade de dígitos à esquerda
    let newCaret = masked.length;
    if (digitsBeforeCaret > 0) {
      let count = 0;
      for (let i = 0; i < masked.length; i++) {
        if (/\d/.test(masked[i])) {
          count++;
        }
        if (count >= digitsBeforeCaret) {
          newCaret = i + 1;
          break;
        }
      }
    }

    // Mantém o valor do formulário com a máscara (validator remove a máscara internamente)
    this.parkingForm.get('cnpj')?.setValue(masked, { emitEvent: false });

    // Restaura a posição do caret
    try {
      inputElement.setSelectionRange(newCaret, newCaret);
    } catch {}
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
