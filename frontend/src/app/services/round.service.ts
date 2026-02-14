import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Round } from '@quiz/shared'; // Adjust path as needed

@Injectable({
  providedIn: 'root'
})
export class RoundService {
  // Adjust API URL if needed
  private apiUrl = 'http://localhost:3000/rounds';

  constructor(private http: HttpClient) {}

  /** GET all rounds from the server */
  getAllRounds(): Observable<Round[]> {
    return this.http.get<Round[]>(this.apiUrl);
  }

  /** GET round by id. Will 404 if id not found */
  getRoundById(id: string): Observable<Round> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.get<Round>(url);
  }

  /** POST: add a new round to the server */
  createRound(round: Partial<Round>): Observable<Round> {
    // Backend should assign ID
    return this.http.post<Round>(this.apiUrl, round);
  }

  /** PUT: update the round on the server */
  updateRound(id: string, round: Partial<Round>): Observable<Round> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.put<Round>(url, round);
  }

  /** DELETE: delete the round from the server */
  deleteRound(id: string): Observable<void> {
    const url = `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url);
  }
}
