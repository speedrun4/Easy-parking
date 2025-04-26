import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { GeocodingService } from '../../services/geocoding.service';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { SucessoModalComponent } from 'src/app/components/sucess-modal/sucess-modal.component';
import { ErrorDialogComponent } from 'src/app/components/error-dialog/error-dialog.component';

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
  hidePassword: boolean = true;
  mostrarMensagemSucesso: boolean = false;

  constructor(private fb: FormBuilder,
    private authService: AuthService,
    private geocodingService: GeocodingService,
    private router: Router, 
    public dialog: MatDialog) { }

  ngOnInit(): void {
    this.initializeUserForm();
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

openConfirmationDialog(message: string): void {
    this.dialog.open(SucessoModalComponent, {
      data: { message: message }
    });
  }
  onUserSubmit(perfil: string) {
    if (this.userForm.valid) {
      const usuario = {
        nomeCompleto: this.userForm.get('name')?.value,
        email: this.userForm.get('email')?.value,
        telefone: this.userForm.get('phone')?.value,
        senha: this.userForm.get('password')?.value,
        cpf: this.userForm.get('cpf')?.value,
        perfil: perfil
      };
  
      this.authService.register(usuario).subscribe(
        (response) => {
          console.log('Usuário cadastrado com sucesso', response);
          this.openConfirmationDialog("Usuário cadastrado com sucesso!");
          this.mostrarMensagemSucesso = true; // Exibe a mensagem de sucesso
          // Redirecionar ou mostrar mensagem de sucesso
          this.router.navigate(['/home']);
        },
        (error) => {
          console.error('Erro ao cadastrar usuário', error);
  
          // Verifica o tipo de erro retornado pela API
          if (error.status === 409) { // Código HTTP 409: Conflito
            if (error.error.message.includes('CPF')) {
              this.openErrorDialog("O CPF já está cadastrado. Por favor, use outro CPF.");
            } else if (error.error.message.includes('Email')) {
              this.openErrorDialog("O Email já está cadastrado. Por favor, use outro Email.");
            } else if (error.error.message.includes('Telefone')) {
              this.openErrorDialog("O Telefone já está cadastrado. Por favor, use outro Telefone.");
            } else {
              this.openErrorDialog("Ocorreu um erro de duplicidade. Por favor, verifique os dados.");
            }
          } else {
            this.openErrorDialog("Ocorreu um erro ao cadastrar. Tente novamente mais tarde.");
          }
        }
      );
    }
  }

  openErrorDialog(message: string): void {
      this.dialog.open(ErrorDialogComponent, {
        data: { message: message }
      });
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
  goToLogin() {
    this.router.navigate(['/home']);
  }
}
