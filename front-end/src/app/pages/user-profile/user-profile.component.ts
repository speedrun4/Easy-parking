import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'src/app/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ConfirmationDialogComponent } from 'src/app/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  userData: any = null; // Dados do usuário
  displayedColumns: string[] = ['nomeCompleto', 'email', 'telefone', 'acoes'];

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

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
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: { message: 'Tem certeza de que deseja excluir sua conta? Esta ação não poderá ser desfeita.' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        const userId = this.userData.id;
        if (!userId) {
          console.error('ID do usuário está indefinido!');
          return;
        }
        this.authService.deleteAccount(userId).subscribe(
          () => {
            this.snackBar.open('Conta excluída com sucesso!', 'Fechar', { duration: 3000 });
            this.authService.logout();
            this.userData = null;
            this.router.navigate(['/home']);
          },
          (error) => {
            this.snackBar.open('Erro ao excluir a conta. Tente novamente mais tarde.', 'Fechar', { duration: 3000 });
            console.error('Erro ao excluir a conta:', error);
          }
        );
      }
    });
  }
}
