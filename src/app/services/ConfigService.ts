// src/app/services/config.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: any;

  constructor(private http: HttpClient) {}

  async loadConfig(): Promise<void> {
    this.config = await firstValueFrom(this.http.get('/assets/config.json'));
  }

  get headerText(): string {
    return this.config?.chatHeader || 'Chat';
  }

  get welcomeMessages(): string[] {
    return this.config?.welcomeMessages || [];
  }
}
