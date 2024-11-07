import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, throwError } from "rxjs";
import { catchError, map } from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/usuarios'; // URL da API do backend
  private currentUserSubject: BehaviorSubject<any | null>;
  public currentUser: Observable<any | null>;

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<any | null>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  // Registro de usuário (opcional, conforme necessário)
  register(usuario: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, usuario).pipe(
      catchError(this.handleError)
    );
  }

  // Login do usuário, agora com perfil retornado do backend
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      map(user => {
        if (user && user.token && user.perfil) {
          return user;
        }
        return null;
      }),
      catchError(this.handleError)
    );
  }

  // Expor um método público para definir o currentUserSubject
  setCurrentUser(user: any): void {
    const isClient = user.perfil === 'cliente';
  const loginAsUser = user.loginAsUser || false; // Login como usuário ou cliente
  const currentUser = { ...user, isClient, loginAsUser };
  this.currentUserSubject.next(currentUser);
  }

  // Logout e remoção dos dados do usuário armazenados
  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  // Verifica se o usuário está autenticado
  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Verifica se o usuário é um cliente
  isClient(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser && currentUser.perfil === 'cliente'; // Checa o perfil do usuário
  }

  // Obtém o usuário atual com base no localStorage
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  // Tratamento de erro para requisições HTTP
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Um erro ocorreu';
    if (error.error instanceof ErrorEvent) {
      // Erro do lado do cliente
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro do lado do servidor
      errorMessage = `Erro: ${error.status} - ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
  sendPasswordToEmail(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/send-password`, email).pipe(
        catchError(this.handleError)
    );
  }
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  autoLogin(): void {
    const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (storedUser) {
      const isClient = storedUser.perfil === 'cliente';
      const loginAsUser = storedUser.loginAsUser || false; // Diferencia o tipo de login
      this.setCurrentUser({ ...storedUser, isClient, loginAsUser });
    }
  }
}
