import { Component } from '@angular/core';
import { SessionSyncService } from './services/session-sync.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'proyecto-webapp';

  constructor(private sessionSync: SessionSyncService) {
    // Inicializa la sincronización de sesión entre pestañas
  }
}
