import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, map, delay, tap } from 'rxjs/operators';

export interface CTAItem {
  name: string;
  value: string;
}

export interface VideoLink {
  name: string;
  value: string;
}

export interface CTAResponse {
  cta?: CTAItem[];
  videoLinks?: VideoLink[];
}

export interface Usages {
  inputtoken: number;
  outputtikem: number;
  cost: number;
  duration: number;
  isEstimated: boolean;
}

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  timestamp: Date;
  response?: ChatAssistantResponse;
  // Message parts for pipe-separated content
  messageParts?: string[];
}

export interface ChatAssistantResponse {
  response: string;
  message?: string;
  CTAResponse?: CTAResponse[];
  usages?: Usages;
  // Response parts for pipe-separated content
  responseParts?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatAssistantService {
  private apiUrl = ' http://localhost:3000/api';
  private sessionId: string;

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public messages$ = this.messagesSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Send a message and update the message list
   */
  sendMessage(message: string): Observable<ChatAssistantResponse> {
    this.loadingSubject.next(true);

    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      message,
      isUser: true,
      timestamp: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, userMessage]);

    return this.getAssistantReplies(message).pipe(
      tap(response => {
        // Ensure we split the response by pipe
        const messageParts = this.splitMessageByPipe(response.response);

        const assistantMessage: ChatMessage = {
          id: this.generateMessageId(),
          message: response.response,
          isUser: false,
          timestamp: new Date(),
          response,
          // Always set messageParts from the response
          messageParts: messageParts
        };

        const updatedMessages = this.messagesSubject.value;
        this.messagesSubject.next([...updatedMessages, assistantMessage]);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Split message content by pipe separator - IMPROVED
   */
  private splitMessageByPipe(message: string): string[] {
    if (!message || typeof message !== 'string') return [];

    // Split by pipe and clean up each part
    const parts = message.split('|')
      .map(part => part.trim())
      .filter(part => part.length > 0);

    console.log('Original message:', message);
    console.log('Split into parts:', parts);

    return parts;
  }

  /**
   * Main method to get assistant replies
   */
  getAssistantReplies(message: string): Observable<ChatAssistantResponse> {
    const headers = this.getHttpHeaders();

    const payload = {
      message: message,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      context: {
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    };

    return this.http.post<any>(`${this.apiUrl}/chat`, payload, { headers }).pipe(
      map(response => this.normalizeApiResponse(response)),
      catchError(error => this.handleApiError(error, message))
    );
  }

  /**
   * Get auto-completion suggestions - IMPROVED
   */
  getChatCompletions(partialMessage: string): Observable<string[]> {
    // Don't make API calls for very short messages
    if (!partialMessage || partialMessage.length <= 2) {
      return of([]);
    }

    const headers = this.getHttpHeaders();

    const payload = {
      message: partialMessage,
      sessionId: this.sessionId,
      source: "portal",
      playType: "Basic Option"
    };

    return this.http.post<string[]>(`http://localhost:4200/autocomplete`, payload, { headers }).pipe(
      catchError(error => {
        console.warn('Auto-completion failed:', error);
        // Return empty array instead of mock suggestions to avoid unwanted suggestions
        return of([]);
      })
    );
  }

  /**
   * Handle CTA (Call-to-Action) button clicks
   */
  handleCTAAction(action: CTAItem): Observable<any> {
    const headers = this.getHttpHeaders();

    const payload = {
      action: action.value,
      actionName: action.name,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    return this.http.post(`${this.apiUrl}/cta-action`, payload, { headers }).pipe(
      catchError(error => {
        console.error('CTA action failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Send feedback about the conversation
   */
  sendFeedback(messageId: string, rating: number, comment?: string): Observable<any> {
    const headers = this.getHttpHeaders();

    const payload = {
      messageId,
      rating,
      comment,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    return this.http.post(`${this.apiUrl}/feedback`, payload, { headers }).pipe(
      catchError(error => {
        console.error('Feedback submission failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear session data
   */
  clearSession(): Observable<any> {
    const headers = this.getHttpHeaders();

    return this.http.delete(`${this.apiUrl}/session/${this.sessionId}`, { headers }).pipe(
      map(() => {
        this.sessionId = this.generateSessionId();
        this.messagesSubject.next([]);
        return { success: true };
      }),
      catchError(error => {
        console.warn('Session clear failed:', error);
        this.sessionId = this.generateSessionId();
        this.messagesSubject.next([]);
        return of({ success: true, warning: 'Session cleared locally only' });
      })
    );
  }

  /**
   * Get session information
   */
  getSessionInfo(): Observable<any> {
    const headers = this.getHttpHeaders();

    return this.http.get(`${this.apiUrl}/session/${this.sessionId}`, { headers }).pipe(
      catchError(error => {
        console.warn('Failed to get session info:', error);
        return of({ sessionId: this.sessionId, messages: 0, created: new Date() });
      })
    );
  }

  /**
   * Get current messages
   */
  getMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }

  /**
   * Normalize different API response formats into a consistent structure - IMPROVED
   */
  private normalizeApiResponse(response: any): ChatAssistantResponse {
    if (typeof response === 'string') {
      const responseParts = this.splitMessageByPipe(response);
      return {
        response: response,
        CTAResponse: [],
        usages: this.getDefaultUsages(),
        responseParts: responseParts
      };
    }

    if (response && typeof response === 'object') {
      const responseText = response.response || response.message || response.reply || JSON.stringify(response);
      const responseParts = this.splitMessageByPipe(responseText);

      return {
        response: responseText,
        CTAResponse: response.CTAResponse || response.ctaResponse || response.actions || [],
        usages: response.usages || response.usage || this.getDefaultUsages(),
        responseParts: responseParts
      };
    }

    const fallbackMessage = 'I received an unexpected response format. Please try again.';
    return {
      response: fallbackMessage,
      CTAResponse: [],
      usages: this.getDefaultUsages(),
      responseParts: [fallbackMessage]
    };
  }

  /**
   * Handle API errors gracefully
   */
  private handleApiError(error: HttpErrorResponse, originalMessage: string): Observable<ChatAssistantResponse> {
    console.error('API Error:', error);

    let errorMessage = 'I apologize, but I encountered an error. Please try again.';
    let ctaResponse: CTAResponse[] = [
      {
        cta: [
          { name: "Try Again", value: "retry" },
          { name: "Contact Support", value: "support" }
        ]
      }
    ];

    if (error.status === 0) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.status === 429) {
      errorMessage = 'Too many requests. Please wait a moment before trying again.';
      ctaResponse = [
        {
          cta: [
            { name: "Wait and Retry", value: "wait_retry" }
          ]
        }
      ];
    } else if (error.status === 500) {
      errorMessage = 'Server error occurred. Our team has been notified.';
    } else if (error.status === 401) {
      errorMessage = 'Authentication required. Please refresh the page and try again.';
      ctaResponse = [
        {
          cta: [
            { name: "Refresh Page", value: "refresh" }
          ]
        }
      ];
    }

    if (this.shouldUseMockResponse()) {
      return this.getMockResponse(originalMessage);
    }

    return of({
      response: errorMessage,
      CTAResponse: ctaResponse,
      usages: this.getDefaultUsages(),
      responseParts: [errorMessage]
    });
  }

  /**
   * Get mock response for development/testing - UPDATED WITH BETTER PIPE EXAMPLES
   */
  private getMockResponse(message: string): Observable<ChatAssistantResponse> {
    const mockResponses: ChatAssistantResponse[] = [
      {
        response: `I understand you said: "${message}". This is a mock response for development purposes.|1. This is a mock response for part 2 purposes.|2. This is a mock response for part 3 purposes with <a href="https://www.w3schools.com">Visit W3Schools.com!</a>`,
        CTAResponse: [
          {
            cta: [
              { name: "Tell me more", value: "more_info" },
              { name: "Ask another question", value: "new_question" }
            ]
          }
        ],
        usages: {
          inputtoken: message.length,
          outputtikem: 50,
          cost: 0.001,
          duration: 500,
          isEstimated: true
        }
      },
      {
        response: `That's an interesting question about "${message}". Here's what I think...|Additional details about your question with more information.|Final thoughts and recommendations for your consideration.|Here's a bonus tip that might help you further.`,
        CTAResponse: [
          {
            cta: [
              { name: "Learn more", value: "learn_more" },
              { name: "See examples", value: "examples" }
            ],
            videoLinks: [
              { name: "Tutorial Video", value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
              { name: "Demo Video", value: "https://www.youtube.com/watch?v=oHg5SJYRHA0" }
            ]
          }
        ],
        usages: {
          inputtoken: message.length,
          outputtikem: 75,
          cost: 0.0015,
          duration: 750,
          isEstimated: true
        }
      }
    ];

    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    // Ensure responseParts are properly set
    randomResponse.responseParts = this.splitMessageByPipe(randomResponse.response);

    console.log('Mock response generated:', randomResponse);
    console.log('Response parts:', randomResponse.responseParts);

    return of(randomResponse).pipe(
      delay(Math.random() * 1000 + 500)
    );
  }

  /**
   * Check if mock responses should be used (useful for development)
   */
  private shouldUseMockResponse(): boolean {
    return localStorage.getItem('use_mock_responses') === 'true' ||
      !this.apiUrl.includes('production') ||
      this.apiUrl.includes('localhost') ||
      this.apiUrl.includes('your-api-endpoint.com');
  }

  /**
   * Generate HTTP headers for API requests
   */
  private getHttpHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Session-ID': this.sessionId,
    });
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const stored = sessionStorage.getItem('chat_session_id');
    if (stored) {
      return stored;
    }

    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('chat_session_id', sessionId);
    return sessionId;
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get default usage statistics
   */
  private getDefaultUsages(): Usages {
    return {
      inputtoken: 0,
      outputtikem: 0,
      cost: 0,
      duration: 0,
      isEstimated: true
    };
  }

  /**
   * Enable mock responses for development
   */
  enableMockMode(): void {
    localStorage.setItem('use_mock_responses', 'true');
  }

  /**
   * Disable mock responses
   */
  disableMockMode(): void {
    localStorage.removeItem('use_mock_responses');
  }

  /**
   * Check if mock mode is enabled
   */
  isMockModeEnabled(): boolean {
    return this.shouldUseMockResponse();
  }
}
