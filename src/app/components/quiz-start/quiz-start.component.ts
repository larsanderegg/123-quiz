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
  private introSound: HTMLAudioElement;

  constructor(private router: Router) {
    this.introSound = new Audio('assets/sounds/intro.mp3');
  }

  ngOnInit(): void {
    this.introSound.load();
  }

  onStart(): void {
    this.introSound.play();
    this.router.navigate(['/quiz/overview']);
  }
}
