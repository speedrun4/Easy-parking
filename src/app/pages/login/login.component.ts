import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ErrorDialogComponent } from 'src/app/error-dialog/error-dialog.component';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  showErrorModal: boolean = false;

  constructor(private fb: FormBuilder, private router: Router,
    private authService: AuthService,   public dialog: MatDialog) {
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
            this.openErrorDialog();  // Abre o modal de erro ao receber 401
          }
          console.error('Erro no login', error);
          this.errorMessage = 'Credenciais inválidas. Tente novamente.';
        }
      });
    } else {
      this.errorMessage = 'Por favor, preencha todos os campos corretamente.';
    }
  }

  closeModal() {
    this.showErrorModal = false;
  }
  openErrorDialog(): void {
    this.dialog.open(ErrorDialogComponent);  // Abre o modal de erro
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
