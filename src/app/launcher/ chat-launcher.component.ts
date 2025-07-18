import { Component, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import {ChatAssistant} from '../chat-assistant/chat-assistant';

@Component({
  selector: 'chat-launcher',
  standalone: true,
  imports: [ChatAssistant, NgIf],
  template: `
    <button class="launcher" (click)="toggle()">
      💬
    </button>
    <div class="chat-drawer" *ngIf="isOpen">
      <app-chat-assistant></app-chat-assistant>
    </div>
  `,
  styles: [`
    .launcher {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      font-size: 1.5rem;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      z-index: 999;
    }
    .chat-drawer {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 300px;
      height: 400px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
    }
  `]
})
export class ChatLauncherComponent {
  isOpen = signal(false);
  toggle() {
    this.isOpen.set(!this.isOpen());
  }
}
