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
}

export interface ChatAssistantResponse {
  response: string;
  message?: string; // Alternative field name for response
  CTAResponse?: CTAResponse[];
  usages?: Usages;
}

@Injectable({
  providedIn: 'root'
})
export class ChatAssistantService {
  private apiUrl = ' http://localhost:3000/api'; // Replace with your actual API URL
  private sessionId: string;

  // Add missing observables for message and loading state
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

    // Add user message to the list
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
        // Add assistant response to the list
        const assistantMessage: ChatMessage = {
          id: this.generateMessageId(),
          message: response.response,
          isUser: false,
          timestamp: new Date(),
          response
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
   * Main method to get assistant replies
   * This method handles both the original simple format and the new enhanced format
   */
  getAssistantReplies(message: string): Observable<ChatAssistantResponse> {
    const headers = this.getHttpHeaders();

    const payload = {
      message: message,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      // Add any additional context your API might need
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
   * Get auto-completion suggestions
   */
  getChatCompletions(partialMessage: string): Observable<string[]> {
    const headers = this.getHttpHeaders();

    const payload = {
      message: partialMessage,
      sessionId: this.sessionId,
      source:"portal",
      playType:"Basic Option"
    };

    return this.http.post<string[]>(`http://localhost:4200/autocomplete`, payload, { headers }).pipe(
      catchError(error => {
        console.warn('Auto-completion failed:', error);
        // Return mock suggestions as fallback
        return this.getMockSuggestions(partialMessage);
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
        // Clear messages when session is cleared
        this.messagesSubject.next([]);
        return { success: true };
      }),
      catchError(error => {
        console.warn('Session clear failed:', error);
        // Generate new session ID anyway
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
   * Normalize different API response formats into a consistent structure
   */
  private normalizeApiResponse(response: any): ChatAssistantResponse {
    // Handle various possible response formats
    if (typeof response === 'string') {
      return {
        response: response,
        CTAResponse: [],
        usages: this.getDefaultUsages()
      };
    }

    if (response && typeof response === 'object') {
      return {
        response: response.response || response.message || response.reply || JSON.stringify(response),
        CTAResponse: response.CTAResponse || response.ctaResponse || response.actions || [],
        usages: response.usages || response.usage || this.getDefaultUsages()
      };
    }

    // Fallback for unexpected formats
    return {
      response: 'I received an unexpected response format. Please try again.',
      CTAResponse: [],
      usages: this.getDefaultUsages()
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

    // Customize error messages based on error type
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

    // // For development/testing, you might want to enable mock responses
    // if (this.shouldUseMockResponse()) {
    //   return this.getMockResponse(originalMessage);
    // }

    return of({
      response: errorMessage,
      CTAResponse: ctaResponse,
      usages: this.getDefaultUsages()
    });
  }

  /**
   * Get mock response for development/testing
   */
  private getMockResponse(message: string): Observable<ChatAssistantResponse> {
    const mockResponses: ChatAssistantResponse[] = [
      {
        response: `I understand you said: "${message}". This is a mock response for development purposes.`,
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
        response: `That's an interesting question about "${message}". Here's what I think...`,
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

    return of(randomResponse).pipe(
      delay(Math.random() * 1000 + 500) // Simulate network delay
    );
  }

  /**
   * Get mock auto-completion suggestions
   */
  private getMockSuggestions(partialMessage: string): Observable<string[]> {
    const suggestions = [
      `${partialMessage} and how does it work?`,
      `${partialMessage} with examples`,
      `${partialMessage} step by step guide`,
      `${partialMessage} best practices`,
      `${partialMessage} troubleshooting`
    ];

    return of(suggestions.slice(0, 3)).pipe(
      delay(200)
    );
  }

  /**
   * Check if mock responses should be used (useful for development)
   */
  private shouldUseMockResponse(): boolean {
    // You can control this via environment variables or local storage
    return localStorage.getItem('use_mock_responses') === 'true' ||
      !this.apiUrl.includes('production') ||
      this.apiUrl.includes('localhost') ||
      this.apiUrl.includes('your-api-endpoint.com'); // Default placeholder URL
  }

  /**
   * Generate HTTP headers for API requests
   */
  private getHttpHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Session-ID': this.sessionId,
      // Add any other headers your API requires
      // 'Authorization': 'Bearer ' + this.getAuthToken(),
      // 'X-API-Key': 'your-api-key'
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
