import { Component } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

// Import Angular Material Modules for Navigation
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // Optional, for icons

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule, // Include if using mat-icon
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'] // Use .scss
})
export class AppComponent {
  title = 'Quiz App'; // Updated title
  isPlayerActive = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isPlayerActive = event.urlAfterRedirects.startsWith('/quiz');
    });
  }
}
