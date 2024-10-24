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
          const perfil = response.perfil; // Supondo que o perfil seja retornado no login.
          const token = response.token;
          localStorage.setItem('token', token);
  
          if (type === 'user') {
            // Apenas usuários com perfil 'usuario' ou 'cliente' podem acessar
            if (perfil === 'usuario' || perfil === 'cliente') {
              this.router.navigate(['/welcome']);
            } else {
              this.openErrorDialog('Perfil não autorizado para login de usuário.');
            }
          } else if (type === 'client') {
            // Apenas usuários com perfil 'cliente' podem acessar
            if (perfil === 'cliente') {
              this.router.navigate(['/cliente']);
            } else {
              this.openErrorDialog('Apenas clientes podem acessar esta seção.');
            }
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
