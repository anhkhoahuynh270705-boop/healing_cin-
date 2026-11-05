import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Shell của ứng dụng; từng nghiệp vụ nằm trong features riêng. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent {}

// Giữ alias để các tệp kiểm thử cũ có thể import tên App.
export { AppComponent as App };
