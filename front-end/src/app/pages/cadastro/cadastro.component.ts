import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { EstacionamentoService } from '../../services/estacionamento.service';
import { GeocodingService } from '../../services/geocoding.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';
import { SucessoModalComponent } from 'src/app/components/sucess-modal/sucess-modal.component';
import { ErrorDialogComponent } from 'src/app/components/error-dialog/error-dialog.component';

@Component({
  selector: 'app-cadastro',
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.scss']
})
export class CadastroComponent implements OnInit, OnDestroy {
  readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly firstReservationPromoCode = 'first-reservation-10';
  private activeCameraStream: MediaStream | null = null;

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

    if (!value) {
      return null;
    }

    if (value.length !== 11) {
      return { cpfLengthInvalid: true };
    }

    if (/(\d)\1{10}/.test(value)) {
      return { cpfInvalid: true };
    }

    const calculateCheckDigit = (cpfBase: string, factor: number): number => {
      let total = 0;
      for (let i = 0; i < cpfBase.length; i++) {
        total += Number(cpfBase[i]) * (factor - i);
      }
      const remainder = total % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const firstDigit = calculateCheckDigit(value.substring(0, 9), 10);
    const secondDigit = calculateCheckDigit(value.substring(0, 10), 11);

    if (firstDigit !== Number(value[9]) || secondDigit !== Number(value[10])) {
      return { cpfInvalid: true };
    }

    return null;
  }
  aguardandoConfirmacao = false;
  codigoConfirmacao: string = '';
  erroConfirmacao: string = '';

  showUserForm = true;
  hideClientRegistrationOption = false;
  activePromoCode: string | null = null;
  promoBannerMessage: string = '';
  userForm!: FormGroup;
  parkingForm!: FormGroup;
  estacionamentos: any[] = [];
  mostrarModalSucesso = false;
  hidePassword: boolean = true;
  mostrarMensagemSucesso: boolean = false;
  fotoBase64: string | null = null;
  previewUrl: string | null = null;
  cameraPreviewOpen = false;
  cameraUnavailableMessage = '';

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private fb: FormBuilder,
    private authService: AuthService,
    private geocodingService: GeocodingService,
    private router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog) { }

  ngOnInit(): void {
    this.activePromoCode = this.route.snapshot.queryParamMap.get('promo');
    this.hideClientRegistrationOption = this.activePromoCode === this.firstReservationPromoCode;
    this.showUserForm = this.hideClientRegistrationOption ? true : this.showUserForm;
    this.promoBannerMessage = this.hideClientRegistrationOption
      ? 'Promocao ativa: 10% OFF na primeira reserva. Cadastre-se como usuario para liberar a oferta no pagamento.'
      : '';
    this.initializeUserForm();
  }

  ngOnDestroy(): void {
    this.stopCameraStream();
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
        fotoBase64: this.fotoBase64
      };

      this.authService.register(usuario).subscribe({
        next: (response: any) => {
          // Só persiste a foto no front após confirmar o cadastro.
          if (this.previewUrl) {
            localStorage.setItem('guestAvatarDataUrl', this.previewUrl);
            window.dispatchEvent(new CustomEvent('guest-avatar-updated', { detail: this.previewUrl }));
          }

          const dialogRef = this.dialog.open(SucessoModalComponent, {
            data: { message: response.message || 'Cadastro realizado com sucesso!' }
          });
          dialogRef.afterClosed().subscribe(() => {
            const queryParams = this.activePromoCode === this.firstReservationPromoCode
              ? { promo: this.activePromoCode, returnUrl: '/welcome', loginType: 'user' }
              : undefined;
            this.router.navigate(['/login'], queryParams ? { queryParams } : undefined);
          });
        },
        error: (error: any) => {
          this.openErrorDialog(this.buildRegistrationErrorMessage(error));
        }
      });
    }
  }

  private buildRegistrationErrorMessage(error: any): string {
    const baseMessage =
      error?.error?.message ||
      error?.error ||
      error?.message ||
      'Erro ao realizar cadastro. Tente novamente.';

    const httpError = error as HttpErrorResponse;
    const statusPart = typeof httpError?.status === 'number' ? `status=${httpError.status}` : 'status=desconhecido';
    const detailPart = httpError?.message ? `detalhe=${httpError.message}` : 'detalhe=sem detalhe';

    return `${baseMessage}\n\nAPI atual: ${this.apiBaseUrl}\n${statusPart}; ${detailPart}`;
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
    const queryParams = this.activePromoCode ? { promo: this.activePromoCode, returnUrl: '/welcome', loginType: 'user' } : undefined;
    this.router.navigate(['/login'], queryParams ? { queryParams } : undefined);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const dataUrl = e.target.result as string;
        this.fotoBase64 = dataUrl.split(',')[1]; // Remove o prefixo data:image/...
        this.previewUrl = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }

  openDeviceCamera(): void {
    this.cameraUnavailableMessage = '';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.cameraUnavailableMessage = 'A câmera não está disponível neste dispositivo ou navegador.';
      return;
    }

    this.cameraPreviewOpen = true;
    const video = this.videoElement.nativeElement;
    video.setAttribute('playsinline', 'true');
    video.muted = true;
    this.stopCameraStream();

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } }).then(stream => {
      this.activeCameraStream = stream;
      video.srcObject = stream;
      return video.play();
    }).catch(() => {
      this.cameraPreviewOpen = false;
      this.cameraUnavailableMessage = 'Não foi possível abrir a câmera. Verifique a permissão do navegador.';
      this.stopCameraStream();
    });
  }

  capturePhotoFromPreview(): void {
    if (!this.cameraPreviewOpen) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    this.fotoBase64 = dataUrl.split(',')[1];
    this.previewUrl = dataUrl;
    this.closeCameraPreview();
  }

  closeCameraPreview(): void {
    this.cameraPreviewOpen = false;
    const video = this.videoElement.nativeElement;
    video.pause();
    video.srcObject = null;
    this.stopCameraStream();
  }

  private stopCameraStream(): void {
    if (this.activeCameraStream) {
      this.activeCameraStream.getTracks().forEach(track => track.stop());
      this.activeCameraStream = null;
    }
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement?.click();
  }
}
