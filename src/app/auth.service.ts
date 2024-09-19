import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<any | null>; // BehaviorSubject para armazenar o estado do usuário
  public currentUser: Observable<any | null>; // Observable para que os componentes possam observar as mudanças

  constructor() {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<any | null>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  login(email: string, password: string): Observable<any> {
    const mockUser = {
      email: 'usuario@exemplo.com',
      password: '123456',
      name: 'Patricia Moura',
      token: 'fake-jwt-token'
    };

    if (email === mockUser.email && password === mockUser.password) {
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      this.currentUserSubject.next(mockUser); // Atualiza o BehaviorSubject
      return of({ token: mockUser.token }).pipe(delay(1000));
    } else {
      return throwError(() => new Error('Credenciais inválidas')).pipe(delay(1000));
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null); // Notifica que o usuário deslogou
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value; // Verifica se há um usuário logado
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value; // Retorna o valor atual do usuário
  }
}
