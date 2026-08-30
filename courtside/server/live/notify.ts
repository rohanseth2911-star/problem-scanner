import type { GameEvent } from '../../shared/types.ts';
import { recordAlert } from '../db.ts';

/**
 * Alert transport. Telegram is the default because it needs no VAPID keys, no
 * service worker and no PWA install to reach a phone — the fastest path from
 * "an event happened" to "my pocket buzzed".
 */
export interface NotificationChannel {
  readonly name: string;
  send(event: GameEvent): Promise<void>;
}

export class ConsoleChannel implements NotificationChannel {
  readonly name = 'console';
  async send(event: GameEvent): Promise<void> {
    const marker = event.type === 'DROP_EVERYTHING' ? '‼️' : '•';
    console.log(`${marker} [alert] ${event.headline} — ${event.detail}`);
  }
}

export class TelegramChannel implements NotificationChannel {
  readonly name = 'telegram';

  constructor(
    private readonly token: string,
    private readonly chatId: string,
  ) {}

  async send(event: GameEvent): Promise<void> {
    const prefix = event.type === 'DROP_EVERYTHING' ? '‼️ ' : '';
    const text = `${prefix}*${escapeMarkdown(event.headline)}*\n${escapeMarkdown(event.detail)}`;
    const response = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_notification: event.type === 'SCORE_CHANGE',
      }),
    });
    if (!response.ok) {
      throw new Error(`Telegram responded ${response.status}: ${await response.text()}`);
    }
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`);
}

/**
 * Delivery is idempotent at the database level: the alert_log primary key is
 * the event's dedupe key, so a re-poll or a restart can never double-buzz.
 */
export class Notifier {
  constructor(private readonly channel: NotificationChannel) {}

  get channelName(): string {
    return this.channel.name;
  }

  async deliver(event: GameEvent): Promise<boolean> {
    const claimed = recordAlert(event.dedupeKey, event.gameId, this.channel.name, false);
    if (!claimed) return false; // already sent

    try {
      await this.channel.send(event);
      recordAlert(event.dedupeKey, event.gameId, this.channel.name, true);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[alert] delivery failed: ${message}`);
      return false;
    }
  }
}

export function buildNotifier(): Notifier {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) return new Notifier(new TelegramChannel(token, chatId));
  return new Notifier(new ConsoleChannel());
}
