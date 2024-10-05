import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { CadastroComponent } from './cadastro/cadastro.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { ConfirmComponent } from './confirm/confirm.component';
import { PaymentComponent } from './payment/payment.component';
import { SplashComponent } from './splash/splash.component';

const routes: Routes = [
  { path: '', component: SplashComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent }, // rota para a página de login
  { path: 'cadastro', component: CadastroComponent },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'confirm', component: ConfirmComponent },
  { path: 'payment', component: PaymentComponent },
  { path: '', redirectTo: '/welcome', pathMatch: 'full' },
  // adicione outras rotas aqui
  { path: '**', redirectTo: '' } // rota para página não encontrada
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
