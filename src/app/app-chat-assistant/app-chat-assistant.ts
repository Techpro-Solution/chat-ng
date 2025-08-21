import {Component, ElementRef, Input, ViewChild, OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ChatAssistantService, CTAItem, VideoLink, ChatMessage, ChatAssistantResponse} from './ChatAssistantService';
import {debounceTime, distinctUntilChanged, Subject, takeUntil} from 'rxjs';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';

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

  constructor(private chatService: ChatAssistantService,private domSanitizer: DomSanitizer) {
    // Setup auto-completion
    this.inputSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (value.length > 2) {
        // this.getChatCompletions(value);
      } else {
        this.suggestions = [];
      }
    });
  }

  ngOnInit(): void {
    // Subscribe to messages
    this.chatService.messages$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((messages: ChatMessage[]) => {
      this.messages = messages;
      // this.scrollToBottom();
    });

    // Subscribe to loading state
    this.chatService.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((loading: boolean) => {
      this.isLoading = loading;
      if (loading) {
        // this.scrollToBottom();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInputChange(): void {
    this.inputSubject.next(this.currentMessage);
  }

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

  selectSuggestion(suggestion: string): void {
    this.currentMessage = suggestion;
    this.suggestions = [];
    this.messageInput.nativeElement.focus();
  }

  // CTA handling
  onCTAClick(cta: CTAItem): void {
    console.log('CTA clicked:', cta);

    // Handle special actions
    if (cta.value === 'retry') {
      // this.retryLastMessage();
      return;
    }

    if (cta.value === 'support') {
      // Handle support action
      this.currentMessage = 'I need help with support';
      this.sendMessage();
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

  // Message handling
  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const message = this.currentMessage.trim();
    this.currentMessage = '';
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

  onVideoClick(video: VideoLink): void {
    this.selectedVideo = video;
    this.showVideoPlayer = true;
    console.log('Video selected:', video);
  }

  closeVideoPlayer(): void {
    this.showVideoPlayer = false;
    this.selectedVideo = null;
  }

  getCTAItems(): CTAItem[] {
    const ctaResponseItem = this.chatResponse?.CTAResponse?.find(item => item.cta);
    return ctaResponseItem?.cta || [];
  }

  // Get CTA items from a specific message response
  getCTAItemsFromMessage(response: ChatAssistantResponse): CTAItem[] {
    const ctaResponseItem = response?.CTAResponse?.find(item => item.cta);
    return ctaResponseItem?.cta || [];
  }

  getVideoLinks(): VideoLink[] {
    const videoResponseItem = this.chatResponse?.CTAResponse?.find(item => item.videoLinks);
    return videoResponseItem?.videoLinks || [];
  }

  // Get video links from a specific message response
  getVideoLinksFromMessage(response: ChatAssistantResponse): VideoLink[] {
    const videoResponseItem = response?.CTAResponse?.find(item => item.videoLinks);
    return videoResponseItem?.videoLinks || [];
  }

  hasContent(): boolean {
    return !!(this.chatResponse && (
      this.chatResponse.response ||
      this.getCTAItems().length > 0 ||
      this.getVideoLinks().length > 0
    ));
  }

  // Format timestamp for display
  formatTime(timestamp: Date): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Clear all chat messages
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

  // Retry the last user message
  retryLastMessage(): void {
    const messages = this.chatService.getMessages();
    const lastUserMessage = [...messages].reverse().find(msg => msg.isUser);

    if (lastUserMessage && !this.isLoading) {
      this.sendMessageWithText(lastUserMessage.message);
    }
  }

  // Toggle usage information display
  toggleUsageInfo(): void {
    this.showUsageInfo = !this.showUsageInfo;
  }

  // Send a specific message (used by retry and CTA actions)
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

  // Helper method to check if URL is a YouTube video


  // Get YouTube embed URL
  // Helper method to check if URL is a YouTube video
  isYouTubeVideo(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  // Get YouTube embed URL - now returns SafeResourceUrl
  getYouTubeEmbedUrl(url: string): SafeResourceUrl {
    const videoId = this.extractYouTubeVideoId(url);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    return this.domSanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  // Get safe video URL for non-YouTube videos
  getSafeVideoUrl(url: string): SafeResourceUrl {
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private extractYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Additional method to get safe URL for any video type
  getSafeVideoUrlForModal(): SafeResourceUrl | null {
    if (!this.selectedVideo) return null;

    if (this.isYouTubeVideo(this.selectedVideo.value)) {
      return this.getYouTubeEmbedUrl(this.selectedVideo.value);
    } else {
      return this.getSafeVideoUrl(this.selectedVideo.value);
    }
  }
  // Get YouTube embed URL - now returns SafeResourceUrl
}
