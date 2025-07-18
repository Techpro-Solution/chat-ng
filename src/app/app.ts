import { Component } from '@angular/core';
import {ChatLauncherComponent} from './launcher/ chat-launcher.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatLauncherComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'chat-assistant-app';
}
