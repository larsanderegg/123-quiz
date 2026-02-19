import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-answer-chip',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './answer-chip.component.html',
  styleUrls: ['./answer-chip.component.scss']
})
export class AnswerChipComponent {
  @Input() text: string = '';
  @Input() isCorrect: boolean = false;
  @Input() imageUrl?: string;
  @Input() clickable: boolean = false;
}
