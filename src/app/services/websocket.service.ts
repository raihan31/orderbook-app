import {Observable, Subject} from "rxjs";
import {Injectable} from "@angular/core";

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket;
  private subject: Subject<any>;

  connect(productId: string): Subject<any> {
    const url = 'wss://www.cryptofacilities.com/ws/v1';
    const message = {
      event: 'subscribe',
      feed: 'book_ui_1',
      product_ids: [productId]
    };

    if (!this.subject || this.isClosed()) {
      this.subject = this.createConnection(url, message);
    } else {
      this.sendSubscriptionMessage(message);
    }

    return this.subject;
  }

  disconnect(productId: string) {
    const message = {
      event: 'unsubscribe',
      feed: 'book_ui_1',
      product_ids: [productId]
    };
    this.sendSubscriptionMessage(message);
  }

  private createConnection(url: string, message: object): Subject<any> {
    this.socket = new WebSocket(url);

    const observable = new Observable(observer => {
      this.socket.onmessage = event => observer.next(JSON.parse(event.data));
      this.socket.onerror = error => observer.error(error);
      this.socket.onclose = () => observer.complete();
      return () => this.socket.close();
    });

    const observer = {
      next: (data: Object) => {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify(data));
        }
      }
    };

    this.socket.onopen = () => {
      this.socket.send(JSON.stringify(message));
    };

    return Subject.create(observer, observable);
  }

  private sendSubscriptionMessage(message: object) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  close() {
    this.socket.close();
  }

  isClosed(): boolean {
    return this.socket.readyState === WebSocket.CLOSED;
  }

  throwError() {
    this.socket.onerror(new Event('error'));
  }
}
