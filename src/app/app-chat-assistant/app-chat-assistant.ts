import {Component, ElementRef, Input, ViewChild, OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ChatAssistantService, CTAItem, VideoLink, ChatMessage, ChatAssistantResponse} from './ChatAssistantService';
import {debounceTime, distinctUntilChanged, Subject, takeUntil} from 'rxjs';
import {DomSanitizer, SafeHtml, SafeResourceUrl} from '@angular/platform-browser';

@Component({
  selector: 'app-chat-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-chat-assistant.html',
  styleUrls: ['./app-chat-assistant.css']
})
export class ChatAssistantComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @Input() chatResponse!: ChatAssistantResponse;

  private destroy$ = new Subject<void>();
  private inputSubject = new Subject<string>();

  // Properties
  currentMessage = '';
  messages: ChatMessage[] = [];
  isLoading = false;
  suggestions: string[] = [];
  showUsageInfo = false;

  // Video modal
  selectedVideo: VideoLink | null = null;
  showVideoPlayer = false;

  constructor(private chatService: ChatAssistantService, private domSanitizer: DomSanitizer) {
    // Setup auto-completion
    this.inputSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (value.length > 2) {
        this.getChatCompletions(value);
      } else {
        this.suggestions = [];
      }
    });
  }

  ngOnInit(): void {
    // Hide parent container scrollbars programmatically
    this.hideParentScrollbars();

    // Subscribe to messages
    this.chatService.messages$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((messages: ChatMessage[]) => {
      console.log('Messages updated:', messages);
      this.messages = messages;
      this.scrollToBottom();
    });

    // Subscribe to loading state
    this.chatService.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((loading: boolean) => {
      this.isLoading = loading;
      if (loading) {
        this.scrollToBottom();
      }
    });
  }

  ngOnDestroy(): void {
    // Restore original overflow settings
    this.restoreParentScrollbars();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sanitize HTML content for safe display
   */
  getSafeHtml(html: string): SafeHtml {
    return this.domSanitizer.bypassSecurityTrustHtml(html);
  }

  /**
   * Handle input changes for auto-completion
   */
  onInputChange(): void {
    // Clear suggestions immediately when input is empty or too short
    if (this.currentMessage.length <= 2) {
      this.suggestions = [];
      return;
    }
    this.inputSubject.next(this.currentMessage);
  }

  /**
   * Get chat completions for auto-suggestions
   */
  getChatCompletions(partialMessage: string): void {
    this.chatService.getChatCompletions(partialMessage).subscribe({
      next: (suggestions: string[]) => {
        this.suggestions = suggestions;
      },
      error: (error: any) => {
        console.error('Failed to get completions', error);
        this.suggestions = [];
      }
    });
  }

  /**
   * Select a suggestion from auto-complete
   */
  selectSuggestion(suggestion: string): void {
    this.currentMessage = suggestion;
    this.suggestions = [];
    // Focus back to input after selection
    setTimeout(() => {
      this.messageInput.nativeElement.focus();
    }, 0);
  }

  /**
   * Handle CTA button clicks
   */
  onCTAClick(cta: CTAItem): void {
    console.log('CTA clicked:', cta);

    // Handle special actions
    if (cta.value === 'retry') {
      this.retryLastMessage();
      return;
    }

    if (cta.value === 'support') {
      this.currentMessage = 'I need help with support';
      this.sendMessage();
      return;
    }

    if (cta.value === 'refresh') {
      window.location.reload();
      return;
    }

    if (cta.value === 'wait_retry') {
      setTimeout(() => {
        this.retryLastMessage();
      }, 2000);
      return;
    }

    // Send CTA action to service
    this.chatService.handleCTAAction(cta).subscribe({
      next: (response: any) => {
        console.log('CTA action handled', response);
      },
      error: (error: any) => {
        console.error('Failed to handle CTA action', error);
      }
    });
  }

  /**
   * Send a new message
   */
  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const message = this.currentMessage.trim();
    this.currentMessage = '';
    // Clear suggestions immediately when sending
    this.suggestions = [];

    this.chatService.sendMessage(message).subscribe({
      next: (response: ChatAssistantResponse) => {
        console.log('Message sent successfully', response);
      },
      error: (error: any) => {
        console.error('Failed to send message', error);
      }
    });
  }

  /**
   * Handle video click to open modal
   */
  onVideoClick(video: VideoLink): void {
    this.selectedVideo = video;
    this.showVideoPlayer = true;
    console.log('Video selected:', video);
  }

  /**
   * Close video player modal
   */
  closeVideoPlayer(): void {
    this.showVideoPlayer = false;
    this.selectedVideo = null;
  }

  /**
   * Get CTA items from chat response (for backward compatibility)
   */
  getCTAItems(): CTAItem[] {
    const ctaResponseItem = this.chatResponse?.CTAResponse?.find(item => item.cta);
    return ctaResponseItem?.cta || [];
  }

  /**
   * Get CTA items from a specific message response
   */
  getCTAItemsFromMessage(response: ChatAssistantResponse): CTAItem[] {
    if (!response?.CTAResponse) return [];
    const ctaResponseItem = response.CTAResponse.find(item => item.cta);
    return ctaResponseItem?.cta || [];
  }

  /**
   * Get video links from chat response (for backward compatibility)
   */
  getVideoLinks(): VideoLink[] {
    const videoResponseItem = this.chatResponse?.CTAResponse?.find(item => item.videoLinks);
    return videoResponseItem?.videoLinks || [];
  }

  /**
   * Get video links from a specific message response
   */
  getVideoLinksFromMessage(response: ChatAssistantResponse): VideoLink[] {
    if (!response?.CTAResponse) return [];
    const videoResponseItem = response.CTAResponse.find(item => item.videoLinks);
    return videoResponseItem?.videoLinks || [];
  }

  /**
   * Check if there's content to display
   */
  hasContent(): boolean {
    return !!(this.chatResponse && (
      this.chatResponse.response ||
      this.getCTAItems().length > 0 ||
      this.getVideoLinks().length > 0
    ));
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp: Date): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * Clear all chat messages
   */
  clearChat(): void {
    this.chatService.clearSession().subscribe({
      next: () => {
        console.log('Chat cleared successfully');
      },
      error: (error) => {
        console.error('Failed to clear chat', error);
      }
    });
  }

  /**
   * Retry the last user message
   */
  retryLastMessage(): void {
    const messages = this.chatService.getMessages();
    const lastUserMessage = [...messages].reverse().find(msg => msg.isUser);

    if (lastUserMessage && !this.isLoading) {
      this.sendMessageWithText(lastUserMessage.message);
    }
  }

  /**
   * Toggle usage information display
   */
  toggleUsageInfo(): void {
    this.showUsageInfo = !this.showUsageInfo;
  }

  /**
   * Send a specific message (used by retry and CTA actions)
   */
  private sendMessageWithText(messageText: string): void {
    if (!messageText.trim() || this.isLoading) return;

    this.chatService.sendMessage(messageText.trim()).subscribe({
      next: (response: ChatAssistantResponse) => {
        console.log('Message sent successfully', response);
      },
      error: (error: any) => {
        console.error('Failed to send message', error);
      }
    });
  }

  /**
   * Check if URL is a YouTube video
   */
  isYouTubeVideo(url: string): boolean {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  /**
   * Get YouTube embed URL - returns SafeResourceUrl
   */
  getYouTubeEmbedUrl(url: string): SafeResourceUrl {
    const videoId = this.extractYouTubeVideoId(url);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    return this.domSanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  /**
   * Get safe video URL for non-YouTube videos
   */
  getSafeVideoUrl(url: string): SafeResourceUrl {
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Get safe URL for modal video (unified method)
   */
  getSafeVideoUrlForModal(): SafeResourceUrl | null {
    if (!this.selectedVideo) return null;

    if (this.isYouTubeVideo(this.selectedVideo.value)) {
      return this.getYouTubeEmbedUrl(this.selectedVideo.value);
    } else {
      return this.getSafeVideoUrl(this.selectedVideo.value);
    }
  }

  /**
   * Scroll chat messages to bottom
   */
  private scrollToBottom(): void {
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      try {
        if (this.chatMessages?.nativeElement) {
          const element = this.chatMessages.nativeElement;
          element.scrollTop = element.scrollHeight;
        }
      } catch (error) {
        console.warn('Failed to scroll to bottom:', error);
      }
    }, 100);
  }

  /**
   * Check if message has multiple parts (split by pipe)
   */
  hasMessageParts(message: ChatMessage): boolean {
    return !!(message.messageParts && message.messageParts.length > 1);
  }

  /**
   * Get message parts or return single message
   */
  getMessageParts(message: ChatMessage): string[] {
    if (message.messageParts && message.messageParts.length > 0) {
      return message.messageParts;
    }
    return message.response?.response ? [message.response.response] : [message.message];
  }

  /**
   * Handle keyboard shortcuts
   */
  onKeyDown(event: KeyboardEvent): void {
    // Ctrl/Cmd + Enter to send message
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      this.sendMessage();
      event.preventDefault();
    }

    // Escape to clear suggestions
    if (event.key === 'Escape') {
      this.suggestions = [];
      event.preventDefault();
    }
  }

  /**
   * Check if we're in mock mode for development
   */
  isMockMode(): boolean {
    return this.chatService.isMockModeEnabled();
  }

  /**
   * Toggle mock mode (for development)
   */
  toggleMockMode(): void {
    if (this.isMockMode()) {
      this.chatService.disableMockMode();
    } else {
      this.chatService.enableMockMode();
    }
  }

  /**
   * Hide parent container scrollbars
   */
  private hideParentScrollbars(): void {
    try {
      // Get all parent elements and hide their scrollbars
      let element = document.querySelector('app-chat-assistant')?.parentElement;

      while (element && element !== document.body) {
        const originalOverflow = element.style.overflow;
        const originalOverflowY = element.style.overflowY;

        // Store original values
        (element as any)._originalOverflow = originalOverflow;
        (element as any)._originalOverflowY = originalOverflowY;

        // Hide scrollbars
        element.style.overflow = 'hidden';
        element.style.overflowY = 'hidden';

        element = element.parentElement;
      }

      // Also try common Angular container selectors
      const commonSelectors = ['app-root', '.container', '.main-container', '.content-wrapper'];
      commonSelectors.forEach(selector => {
        const containers = document.querySelectorAll(selector);
        containers.forEach(container => {
          const el = container as HTMLElement;
          (el as any)._originalOverflow = el.style.overflow;
          (el as any)._originalOverflowY = el.style.overflowY;
          el.style.overflow = 'hidden';
          el.style.overflowY = 'hidden';
        });
      });

    } catch (error) {
      console.warn('Could not hide parent scrollbars:', error);
    }
  }

  /**
   * Restore parent container scrollbars
   */
  private restoreParentScrollbars(): void {
    try {
      // Restore parent elements
      let element = document.querySelector('app-chat-assistant')?.parentElement;

      while (element && element !== document.body) {
        if ((element as any)._originalOverflow !== undefined) {
          element.style.overflow = (element as any)._originalOverflow;
        }
        if ((element as any)._originalOverflowY !== undefined) {
          element.style.overflowY = (element as any)._originalOverflowY;
        }
        element = element.parentElement;
      }

      // Restore common containers
      const commonSelectors = ['app-root', '.container', '.main-container', '.content-wrapper'];
      commonSelectors.forEach(selector => {
        const containers = document.querySelectorAll(selector);
        containers.forEach(container => {
          const el = container as HTMLElement;
          if ((el as any)._originalOverflow !== undefined) {
            el.style.overflow = (el as any)._originalOverflow;
          }
          if ((el as any)._originalOverflowY !== undefined) {
            el.style.overflowY = (el as any)._originalOverflowY;
          }
        });
      });

    } catch (error) {
      console.warn('Could not restore parent scrollbars:', error);
    }
  }
}
