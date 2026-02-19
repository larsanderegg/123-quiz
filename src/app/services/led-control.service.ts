import { Injectable } from '@angular/core';
import { LedControlMode } from '../models';
import { Observable, of } from 'rxjs';

/**
 * LED Control Service
 * 
 * @deprecated This service is currently non-functional as the backend has been removed.
 * LED control functionality is optional and can be implemented in the future via:
 * - Cloud Functions
 * - Separate microservice
 * - Client-side control (if hardware is connected locally)
 */
@Injectable({
  providedIn: 'root'
})
export class LedControlService {
  /**
   * Change LED mode
   * @deprecated This method is non-functional without a backend
   * @param mode The LED control mode
   * @returns Observable that emits false (not implemented)
   */
  changeLedMode(mode: LedControlMode): Observable<boolean> {
    console.warn('LED control is not implemented in the serverless architecture');
    return of(false);
  }
}
