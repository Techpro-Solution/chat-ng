import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private http: HttpClient) {}

  private  sessioniD= "some sesion id"
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
    const payload = {
      message : "this is meesage",
      sessionid : this.sessioniD,
      source: "portal"
    }
    const  headers = new HttpHeaders().set("xkey","somekey")

    return this.http.post<any>(
      "http:www.postman.com",
      payload,{headers}
    )

  }
}
