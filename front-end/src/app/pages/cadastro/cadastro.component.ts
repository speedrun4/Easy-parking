import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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
  // Validador customizado para telefone
  phoneValidator(control: AbstractControl) {
    const value = control.value ? control.value.replace(/\D/g, '') : '';
    // Aceita 10 ou 11 dígitos (fixo ou celular)
    if (value.length !== 10 && value.length !== 11) {
      return { phoneInvalid: true };
    }
    return null;
  }

  // Máscara para telefone
  onPhoneInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    let masked = value;
    if (value.length > 10) {
      masked = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 6) {
      masked = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      masked = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    } else if (value.length > 0) {
      masked = value.replace(/(\d{0,2})/, '($1');
    }
    this.userForm.get('phone')?.setValue(masked, { emitEvent: false });
    inputElement.value = masked;
  }
  // Validador customizado para CPF com máscara
  cpfValidator(control: AbstractControl) {
    const value = control.value ? control.value.replace(/\D/g, '') : '';
    if (value.length !== 11) {
      return { cpfInvalid: true };
    }
    return null;
  }
  aguardandoConfirmacao = false;
  codigoConfirmacao: string = '';
  erroConfirmacao: string = '';

  showUserForm = true; // Controle de qual formulário mostrar
  userForm!: FormGroup;
  parkingForm!: FormGroup;
  estacionamentos: any[] = [];
  mostrarModalSucesso = false;
  hidePassword: boolean = true;
  mostrarMensagemSucesso: boolean = false;
  fotoBase64: string | null = null;
  previewUrl: string | null = null;

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

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
      phone: ['', [Validators.required, this.phoneValidator]],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,11}$/)
        ]
      ],
      cpf: ['', [Validators.required, this.cpfValidator]],  // Aceita CPF com máscara
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
        perfil: perfil,
        fotoBase64: this.fotoBase64 // Adiciona a foto
      };

      // Chama o serviço para enviar o código de confirmação
      this.authService.register(usuario).subscribe(
        (response) => {
          // Sucesso: exibe campo para confirmação
          this.aguardandoConfirmacao = true;
        },
        (error) => {
          // ...existing code...
        }
      );
    }
  }

  // Método para validar o código de confirmação
  validarCodigoConfirmacao() {
    if (!this.codigoConfirmacao) {
      this.erroConfirmacao = 'Digite o código recebido no e-mail.';
      return;
    }
    this.authService.confirmEmail(this.userForm.get('email')?.value, this.codigoConfirmacao).subscribe({
      next: (response: any) => {
        // Sucesso: exibe popup e redireciona após OK
        this.erroConfirmacao = '';
        this.mostrarMensagemSucesso = false;
        this.aguardandoConfirmacao = false;
        const dialogRef = this.dialog.open(SucessoModalComponent, {
          data: { message: response.message || 'Cadastro realizado com sucesso!' }
        });
        dialogRef.afterClosed().subscribe(() => {
          this.router.navigate(['/home']);
        });
      },
      error: (error: any) => {
        // Exibe mensagem do back-end se disponível
        if (error && error.message) {
          this.erroConfirmacao = error.message;
        } else if (error && error.error) {
          this.erroConfirmacao = error.error;
        } else {
          this.erroConfirmacao = 'Erro ao confirmar o código.';
        }
        this.mostrarMensagemSucesso = false;
      }
    });
  }

  openErrorDialog(message: string): void {
      this.dialog.open(ErrorDialogComponent, {
        data: { message: message }
      });
    }
  onCpfInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value.replace(/\D/g, '');
    if (value.length > 11) value = value.substring(0, 11);
    let masked = value;
    if (value.length > 9) {
      masked = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      masked = value.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      masked = value.replace(/(\d{3})(\d{3})/, '$1.$2');
    } else if (value.length > 0) {
      masked = value.replace(/(\d{3})/, '$1');
    }
    // Atualiza o valor do formulário com a máscara
    this.userForm.get('cpf')?.setValue(masked, { emitEvent: false });
    // Atualiza o valor do input manualmente para garantir exibição
    inputElement.value = masked;
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

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fotoBase64 = e.target.result.split(',')[1]; // Remove o prefixo data:image/...
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  openCamera(): void {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    video.style.display = 'block';
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      video.srcObject = stream;
      video.play();
      setTimeout(() => {
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
        this.fotoBase64 = canvas.toDataURL('image/png').split(',')[1];
        this.previewUrl = canvas.toDataURL('image/png');
        video.pause();
        video.srcObject = null;
        video.style.display = 'none';
      }, 2000); // tira a foto após 2 segundos
    });
  }
}
