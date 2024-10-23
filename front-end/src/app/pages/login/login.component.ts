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

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;

      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log('Login bem-sucedido', response);
          localStorage.setItem('token', response.token);
          this.router.navigate(['/welcome']);
        },
        error: (error) => {
          if (error.status === 401) {
            // Aqui, você pode usar a mensagem que deseja mostrar no modal
            this.openErrorDialog("Email ou senha não conferem, por favor tentar novamente.");
          } else {
            // Para outros erros, você pode mostrar uma mensagem genérica ou específica
            this.openErrorDialog("Email ou senha não conferem, por favor tentar novamente.");
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
      data: { message: message } // Passa a mensagem de erro para o diálogo
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

  ngOnInit(): void {
  }

}
