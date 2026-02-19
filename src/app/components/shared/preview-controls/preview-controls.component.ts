import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Preview Controls Component
 *
 * Navigation controls for stepping through quiz preview steps.
 * Shows current step indicator and prev/next buttons.
 */
@Component({
  selector: 'app-preview-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './preview-controls.component.html',
  styleUrls: ['./preview-controls.component.scss']
})
export class PreviewControlsComponent {
  @Input() currentStep: number = 0;
  @Input() totalSteps: number = 8;
  @Output() stepChange = new EventEmitter<number>();

  readonly stepLabels = [
    'Category & Introduction',
    'Question',
    'Answer 1',
    'Answer 2',
    'Answer 3',
    'Blinking',
    'Correct Answer',
    'Explanation'
  ];

  get canGoPrevious(): boolean {
    return this.currentStep > 0;
  }

  get canGoNext(): boolean {
    return this.currentStep < this.totalSteps - 1;
  }

  get stepLabel(): string {
    return this.stepLabels[this.currentStep] || `Step ${this.currentStep}`;
  }

  previousStep(): void {
    if (this.canGoPrevious) {
      this.stepChange.emit(this.currentStep - 1);
    }
  }

  nextStep(): void {
    if (this.canGoNext) {
      this.stepChange.emit(this.currentStep + 1);
    }
  }

  goToStep(step: number): void {
    if (step >= 0 && step < this.totalSteps) {
      this.stepChange.emit(step);
    }
  }
}
