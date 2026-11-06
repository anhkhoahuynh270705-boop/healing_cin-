import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-personal-media-panel',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './personal-media-panel.component.html',
  styleUrl: './personal-media-panel.component.scss',
})
export class PersonalMediaPanelComponent {
  @Input() open = false;
  @Input() authenticated = false;
  @Input() selectedFileName: string | null = null;
  @Input() durationControl!: FormControl<number>;
  @Input() costLabel = '';
  @Input() balanceLabel = '';
  @Input() uploading = false;

  @Output() close = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<Event>();
  @Output() uploadRequested = new EventEmitter<void>();
  @Output() loginRequested = new EventEmitter<void>();
}
