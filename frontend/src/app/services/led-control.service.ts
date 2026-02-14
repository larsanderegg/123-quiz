import {Injectable} from '@angular/core';
import {LedControlMode, Question} from '@quiz/shared';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LedControlService {

  private ledControlApiUrl = 'http://localhost:3000/led-control';

  constructor(private http: HttpClient) {
  }

  changeLedMode(mode: LedControlMode): Observable<boolean> {
    return this.http.put<boolean>(`${this.ledControlApiUrl}/${mode}`, {});
  }
}
