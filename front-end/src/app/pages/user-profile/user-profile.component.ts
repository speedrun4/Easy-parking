import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  userData: any = null; // Dados do usuário
  displayedColumns: string[] = ['nomeCompleto', 'email', 'telefone', 'acoes'];

  constructor(private authService: AuthService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.fetchUserData();
  }

  fetchUserData(): void {
    this.userData = this.authService.getCurrentUser();
    if (!this.userData || !this.userData.id) {
      console.error('Erro: Dados do usuário estão incompletos ou ID não definido!', this.userData);
    } // Obtém os dados do usuário logado
  }

  deleteAccount(): void {
    if (confirm('Tem certeza de que deseja excluir sua conta?')) {
      const userId = this.userData.id; // Certifique-se de que o campo `id` existe no objeto userData
  
      if (!userId) {
        console.error('ID do usuário está indefinido!');
        return;
      }
  
      this.authService.deleteAccount(userId).subscribe(
        () => {
          this.snackBar.open('Conta excluída com sucesso!', 'Fechar', { duration: 3000 });
          this.authService.logout();
          this.userData = null;
        },
        (error) => {
          this.snackBar.open('Erro ao excluir a conta. Tente novamente mais tarde.', 'Fechar', { duration: 3000 });
          console.error('Erro ao excluir a conta:', error);
        }
      );
    }
  }
}
