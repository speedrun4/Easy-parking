import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-esqueci-senha',
  templateUrl: './esqueci-senha.component.html',
  styleUrls: ['./esqueci-senha.component.scss']
})
export class EsqueciSenhaComponent implements OnInit {
  forgotPasswordForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,  // Injeta o serviço de autenticação
    private snackBar: MatSnackBar      // Para exibir mensagens de sucesso ou erro
  ) {}

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() {
    return this.forgotPasswordForm.get('email');
  }

  getErrorMessage() {
    if (this.email?.hasError('required')) {
      return 'Você deve inserir um email';
    }
    return this.email?.hasError('email') ? 'Email inválido' : '';
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      const email = this.forgotPasswordForm.value.email;
  
      this.authService.requestPasswordReset(email).subscribe(
        (response) => {
          this.snackBar.open(response.message, 'Fechar', { duration: 3000 });
        },
        (error) => {
          this.snackBar.open('Erro ao enviar o email de recuperação. Tente novamente.', 'Fechar', {
            duration: 3000
          });
          console.error('Erro ao solicitar recuperação de senha:', error);
        }
      );
    }
  }
}
