import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = false;

  async ngOnInit() {
    // Check if already authenticated and redirect
    const isAuthenticated = await firstValueFrom(
      this.authService.isAuthenticated$.pipe(take(1))
    );

    if (isAuthenticated) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/quiz/start';
      await this.router.navigate([returnUrl]);
      return;
    }

    // Handle redirect result when returning from Google sign-in
    this.isLoading = true;
    try {
      await this.authService.handleRedirectResult();
    } catch (error: any) {
      // Only show error if it's not just "no redirect result"
      if (error.message && !error.message.includes('No redirect')) {
        this.snackBar.open(error.message || 'Sign-in failed. Please try again.', 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    } finally {
      this.isLoading = false;
    }
  }

  async signInWithGoogle() {
    this.isLoading = true;
    try {
      await this.authService.signInWithGoogle();
      // User will be redirected to Google, no need to navigate here
    } catch (error: any) {
      this.isLoading = false;
      this.snackBar.open(error.message || 'Sign-in failed. Please try again.', 'Close', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
    }
  }
}
