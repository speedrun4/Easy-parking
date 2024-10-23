import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ErrorDialogComponent } from 'src/app/components/error-dialog/error-dialog.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  showErrorModal: boolean = false;

  // Variável para controlar a exibição dos formulários
  showUserForm: boolean = true;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    public dialog: MatDialog
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  // Modificar onSubmit para aceitar o tipo de login (usuário ou cliente)
  onSubmit(type: string) {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log('Login bem-sucedido', response);
          localStorage.setItem('token', response.token);

          // Verifica o tipo de login e redireciona
          if (type === 'user') {
            this.router.navigate(['/welcome']);
          } else if (type === 'client') {
            this.router.navigate(['/cliente']);
          }
        },
        error: (error) => {
          if (error.status === 401) {
            this.openErrorDialog("Email ou senha não conferem, por favor tentar novamente.");
          } else {
            this.openErrorDialog("Ocorreu um erro inesperado. Por favor, tente novamente.");
          }
          console.error('Erro no login', error);
        }
      });
    } else {
      this.errorMessage = 'Por favor, preencha todos os campos corretamente.';
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }

  openErrorDialog(message: string): void {
    this.dialog.open(ErrorDialogComponent, {
      data: { message: message }
    });
  }

  loginWithGoogle() {
    console.log('Login with Google');
    // Adicione a lógica de login com Google aqui
  }

  loginWithFacebook() {
    console.log('Login with Facebook');
    // Adicione a lógica de login com Facebook aqui
  }

  ngOnInit(): void {}
}
