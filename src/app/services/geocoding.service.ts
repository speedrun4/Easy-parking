import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {

  private apiKey = 'AIzaSyC1JY-mIJMlZinIwKj3jJYoCV9sXrpWmSk';  // Substitua pela sua chave da API do Google

  constructor(private http: HttpClient) { }

  getCoordinates(address: string): Observable<any> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    return this.http.get(url).pipe(
      map((response: any) => {
        if (response.results && response.results.length > 0) {
          const location = response.results[0].geometry.location;
          return {
            latitude: location.lat,
            longitude: location.lng
          };
        }
        return null;
      })
    );
  }
}
