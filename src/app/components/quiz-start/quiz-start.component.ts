import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-quiz-start',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './quiz-start.component.html',
  styleUrls: ['./quiz-start.component.scss']
})
export class QuizStartComponent implements OnInit {

  constructor(private router: Router) {
  }

  ngOnInit(): void {
  }

  onStart(): void {
    this.router.navigate(['/quiz/overview']);
  }
}
