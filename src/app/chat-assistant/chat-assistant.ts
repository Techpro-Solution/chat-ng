import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ConfigService} from '../services/ConfigService';
import {ApiService} from '../services/api';


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'chat-assistant.html',
  styleUrls: ['chat-assistant.css']
})
export class Chat implements OnInit {
  private config = inject(ConfigService);
  private api = inject(ApiService);

  chatHistory: { sender: 'user' | 'bot'; message: string }[] = [];
  userMessage = '';

  get chatHeader(): string {
    return this.config.headerText || 'AI Assistant';
  }

  ngOnInit(): void {
    const messages = this.config.welcomeMessages || [];
    messages.forEach(msg => {
      this.chatHistory.push({ sender: 'bot', message: msg });
    });
  }

  sendMessage() {
    const trimmed = this.userMessage.trim();
    if (!trimmed) return;

    // Push user message
    this.chatHistory.push({ sender: 'user', message: trimmed });

    // Call ApiService for bot replies
    this.api.getAssistantReplies(trimmed).subscribe(replies => {
      replies.forEach(reply => {
        this.chatHistory.push({ sender: 'bot', message: reply });
      });
    });

    this.userMessage = '';
  }
}
