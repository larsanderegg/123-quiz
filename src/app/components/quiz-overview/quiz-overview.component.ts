import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { RoundService } from '../../services/round.service';
import { Round } from '../../models';
import { take } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-quiz-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './quiz-overview.component.html',
  styleUrls: ['./quiz-overview.component.scss']
})
export class QuizOverviewComponent implements OnInit {
  rounds: Round[] = [];
  groupedRounds: { finale: Round[], halfFinale: Round[], group: Round[] } = { finale: [], halfFinale: [], group: [] };
  isLoading = true;

  constructor(
    private roundService: RoundService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRounds();
  }

  loadRounds(): void {
    this.isLoading = true;
    this.roundService.getAllRounds().pipe(take(1)).subscribe({
      next: (rounds) => {
        const sorted = rounds.sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
        this.rounds = sorted;
        this.groupedRounds = {
          finale: sorted.filter(r => r.type === 'finale'),
          halfFinale: sorted.filter(r => r.type === 'half-finale'),
          group: sorted.filter(r => r.type === 'group' || !r.type),
        };
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading rounds:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  startRound(roundId: string): void {
    this.router.navigate(['/quiz', roundId, 'start']);
  }
}
