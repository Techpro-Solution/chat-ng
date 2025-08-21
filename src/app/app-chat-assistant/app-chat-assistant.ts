import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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

export interface ChatAssistantResponse {
  response: string;
  CTAResponse: CTAResponse[];
  usages: Usages;
}

@Component({
  selector: 'app-chat-assistant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-chat-assistant.html',
  styleUrls: ['./app-chat-assistant.css']
})
export class ChatAssistantComponent {
  @Input() chatResponse!: ChatAssistantResponse;

  selectedVideo: VideoLink | null = null;
  showVideoPlayer = false;

  constructor() {}

  onCTAClick(cta: CTAItem): void {
    // Handle CTA button click
    console.log('CTA clicked:', cta);
    // Add your custom logic here
    // For example: navigate, open modal, make API call, etc.
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

  getVideoLinks(): VideoLink[] {
    const videoResponseItem = this.chatResponse?.CTAResponse?.find(item => item.videoLinks);
    return videoResponseItem?.videoLinks || [];
  }

  hasContent(): boolean {
    return !!(this.chatResponse && (
      this.chatResponse.response ||
      this.getCTAItems().length > 0 ||
      this.getVideoLinks().length > 0
    ));
  }

  // Helper method to check if URL is a YouTube video
  isYouTubeVideo(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  // Get YouTube embed URL
  getYouTubeEmbedUrl(url: string): string {
    const videoId = this.extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  private extractYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}
