import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Chat} from '../chat-assistant/chat-assistant';
import {HttpClientModule} from '@angular/common/http';

@Component({
  selector: 'app-chat-launcher',
  standalone: true,
  imports: [Chat, CommonModule, HttpClientModule,],
  templateUrl: './chat-launcher.html',
  styleUrls: ['./chat-launcher.scss']
})
export class ChatLauncher {
  showChat = false;

  toggleChat() {
    this.showChat = !this.showChat;
  }
}
