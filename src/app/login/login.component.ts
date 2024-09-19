import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(private fb: FormBuilder, private router: Router,
    private authService: AuthService) {
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
          // Armazena o token no localStorage
          localStorage.setItem('token', response.token);

          // Redireciona para a página welcome após o login
          this.router.navigate(['/welcome']);
        },
        error: (error) => {
          console.error('Erro no login', error);
          this.errorMessage = 'Credenciais inválidas. Tente novamente.';
        }
      });
    } else {
      this.errorMessage = 'Por favor, preencha todos os campos corretamente.';
    }
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
