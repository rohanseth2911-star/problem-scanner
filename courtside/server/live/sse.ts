import type { Response } from 'express';

/** Server-Sent Events hub. One-way, auto-reconnecting, proxy-friendly. */
class EventHub {
  private clients = new Set<Response>();

  add(res: Response): void {
    this.clients.add(res);
    res.on('close', () => this.clients.delete(res));
  }

  get size(): number {
    return this.clients.size;
  }

  broadcast(type: string, payload: unknown): void {
    const frame = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(frame);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

export const hub = new EventHub();
