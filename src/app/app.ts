import { Component } from '@angular/core';
import {ChatLauncher} from './chatLauncher/chat-launcher';
import {CommonModule} from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatLauncher, CommonModule, HttpClientModule,],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'chat-assistant-app';
}
