import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LedControlMode } from '../models';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

const STORAGE_KEY = 'led_control_url';

@Injectable({
  providedIn: 'root'
})
export class LedControlService {
  constructor(private http: HttpClient) {}

  getApiUrl(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  setApiUrl(url: string): void {
    localStorage.setItem(STORAGE_KEY, url);
  }

  clearApiUrl(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  changeLedMode(mode: LedControlMode): Observable<boolean> {
    const apiUrl = this.getApiUrl();
    if (!apiUrl) {
      return of(false);
    }
    return this.http.post<any>(`${apiUrl}/mode`, { mode }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
