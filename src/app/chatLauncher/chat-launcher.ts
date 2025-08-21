import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import {ChatAssistantComponent} from '../app-chat-assistant/app-chat-assistant';
import {ChatAssistantResponse} from '../app-chat-assistant/ChatAssistantService';

@Component({
  selector: 'app-chat-launcher',
  standalone: true,
  imports:  [CommonModule, HttpClientModule, ChatAssistantComponent],
  templateUrl: './chat-launcher.html',
  styleUrls: ['./chat-launcher.scss']
})
export class ChatLauncher {
  showChat = false;

  // Sample response data - replace this with your actual API response
  chatResponse: ChatAssistantResponse = {
    "response": "Hello! How can I help you today? Here are some quick actions you can take:",
    "CTAResponse": [
      {
        "cta": [
          {
            "name": "Get Help",
            "value": "help_action"
          },
          {
            "name": "Contact Support",
            "value": "support_action"
          },
          {
            "name": "View Documentation",
            "value": "docs_action"
          }
        ]
      },
      {
        "videoLinks": [
          {
            "name": "Getting Started Tutorial",
            "value": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          },
          {
            "name": "Advanced Features",
            "value": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          }
        ]
      }
    ],
    "usages": {
      "inputtoken": 15,
      "outputtikem": 42,
      "cost": 0.0023,
      "duration": 1250,
      "isEstimated": false
    }
  };

  toggleChat() {
    this.showChat = !this.showChat;
  }

  // Method to handle when you get a real API response
  updateChatResponse(newResponse: ChatAssistantResponse) {
    this.chatResponse = newResponse;
  }
}
