import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Question } from '../../../models';
import { AnswerChipComponent } from '../../shared/answer-chip/answer-chip.component';

@Component({
  selector: 'app-question-item',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    AnswerChipComponent
  ],
  templateUrl: './question-item.component.html',
  styleUrls: ['./question-item.component.scss']
})
export class QuestionItemComponent {
  @Input() question!: Question;
  @Input() answers: any[] = [];
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() duplicate = new EventEmitter<string>();

  expanded: boolean = false;

  toggleExpand(): void {
    this.expanded = !this.expanded;
  }

  onEdit(): void {
    this.edit.emit(this.question.id);
  }

  onDelete(): void {
    if (confirm(`Are you sure you want to delete the question "${this.question.text}"?`)) {
      this.delete.emit(this.question.id);
    }
  }

  onDuplicate(): void {
    this.duplicate.emit(this.question.id);
  }
}
