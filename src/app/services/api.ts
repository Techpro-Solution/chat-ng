import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor() {}

  private responses = [
    "That's a great question!",
    "Let me find that out for you.",
    "Here's something useful.",
    "Hope this helps!",
    "I'll explain that in more detail.",
    "You might find this interesting.",
    "Sure! Here you go.",
    "Let me break that down."
  ];

  getAssistantReplies(userMessage: string) {
    const numReplies = Math.floor(Math.random() * 4) + 1; // 1 to 4
    const shuffled = this.responses.sort(() => 0.5 - Math.random());
    const replies = shuffled.slice(0, numReplies);
    return of(replies).pipe(delay(800));
  }
}
