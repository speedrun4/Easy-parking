import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';


@Component({
  selector: 'app-esqueci-senha',
  templateUrl: './esqueci-senha.component.html',
  styleUrls: ['./esqueci-senha.component.scss']
})
export class EsqueciSenhaComponent implements OnInit {
  forgotPasswordForm!: FormGroup; // O operador '!' indica que será inicializado posteriormente

  constructor(private fb: FormBuilder) {}

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
      console.log(`Enviando email de recuperação para: ${email}`);
      alert('Email de recuperação enviado com sucesso!');
    }
  }
}
