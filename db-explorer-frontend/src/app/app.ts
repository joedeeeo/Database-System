import { Component, signal } from '@angular/core';
import { DbExplorer } from './components/db-explorer/db-explorer';

@Component({
  selector: 'app-root',
  imports: [DbExplorer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('db-explorer-frontend');
}
