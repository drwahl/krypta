import {
  SimpleObservable,
  WidgetDriver,
  type Capability,
  type IOpenIDCredentials,
  type IOpenIDUpdate,
  type IRoomEvent,
  type ITurnServer,
  type ISendDelayedEventDetails,
  OpenIDRequestState,
} from 'matrix-widget-api';
import type { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import type { SendDelayedEventRequestOpts } from 'matrix-js-sdk/lib/@types/requests';
import { UpdateDelayedEventAction } from 'matrix-js-sdk/lib/@types/requests';
import { UnsupportedDelayedEventsEndpointError } from 'matrix-js-sdk/lib/errors';

interface TurnServerCredentials {
  uris: string[];
  username: string;
  password: string;
  ttl?: number;
}

const toRoomEvent = (event: MatrixEvent, roomId: string): IRoomEvent => ({
  type: event.getType(),
  sender: event.getSender() ?? '',
  event_id: event.getId() ?? '', // eslint-disable-line camelcase
  room_id: event.getRoomId() ?? roomId, // eslint-disable-line camelcase
  state_key: event.getStateKey() ?? undefined, // eslint-disable-line camelcase
  origin_server_ts: event.getTs(), // eslint-disable-line camelcase
  content: event.getContent(),
  unsigned: event.getUnsigned(),
});

export class ElementCallWidgetDriver extends WidgetDriver {
  private isDisposed = false;

  public constructor(private readonly client: MatrixClient, private readonly room: Room) {
    super();
  }

  public dispose(): void {
    this.isDisposed = true;
  }

  public override async validateCapabilities(requested: Set<Capability>): Promise<Set<Capability>> {
    // For now, grant all requested capabilities. NyChatt is the trusted host.
    return new Set(requested);
  }

  private async sendMatrixEvent(
    eventType: string,
    content: unknown,
    stateKey: string | null,
    roomId: string | null,
  ): Promise<{ roomId: string; eventId: string }> {
    const targetRoomId = roomId ?? this.room.roomId;
    if (!targetRoomId) {
      throw new Error('No room ID available for sendEvent');
    }

    const eventContent = content ?? {};

    let response: unknown;
    if (stateKey !== null) {
      const resolvedKey = stateKey ?? '';
      response = await this.client.sendStateEvent(
        targetRoomId,
        eventType,
        eventContent as Record<string, unknown>,
        resolvedKey,
      );
    } else {
      response = await this.client.sendEvent(targetRoomId, eventType, eventContent, undefined);
    }

    const eventId = typeof response === 'string' ? response : (response as { event_id?: string })?.event_id ?? '';

    return { roomId: targetRoomId, eventId };
  }

  public override async sendEvent(
    eventType: string,
    content: unknown,
    stateKey: string | null = null,
    roomId: string | null = null,
  ) {
    return this.sendMatrixEvent(eventType, content, stateKey, roomId);
  }

  private buildDelayOpts(delay: number | null, parentDelayId: string | null): SendDelayedEventRequestOpts {
    if (delay === null && parentDelayId === null) {
      throw new Error('Must provide at least one of delay or parentDelayId');
    }

    const opts: Record<string, unknown> = {};
    if (delay !== null) {
      opts.delay = delay;
    }
    if (parentDelayId !== null) {
      opts.parent_delay_id = parentDelayId;
    }
    return opts as SendDelayedEventRequestOpts;
  }

  public override async sendDelayedEvent(
    delay: number | null,
    parentDelayId: string | null,
    eventType: string,
    content: unknown,
    stateKey: string | null = null,
    roomId: string | null = null,
  ): Promise<ISendDelayedEventDetails> {
    const targetRoomId = roomId ?? this.room.roomId;
    const delayOpts = this.buildDelayOpts(delay, parentDelayId);

    try {
      let response;
      if (stateKey !== null) {
        response = await (this.client as any)._unstable_sendDelayedStateEvent(
          targetRoomId,
          delayOpts,
          eventType,
          content,
          stateKey,
        );
      } else {
        response = await (this.client as any)._unstable_sendDelayedEvent(
          targetRoomId,
          delayOpts,
          null,
          eventType,
          content,
        );
      }

      return {
        roomId: targetRoomId,
        delayId: String(response.delay_id),
      };
    } catch (error) {
      if (error instanceof UnsupportedDelayedEventsEndpointError) {
        throw error;
      }
      console.error('[ElementCallWidgetDriver] Failed to send delayed event', error);
      throw error;
    }
  }

  public override async updateDelayedEvent(delayId: string, action: UpdateDelayedEventAction): Promise<void> {
    await (this.client as any)._unstable_updateDelayedEvent(delayId, action);
  }

  public override async cancelScheduledDelayedEvent(delayId: string): Promise<void> {
    await (this.client as any)._unstable_cancelScheduledDelayedEvent(delayId);
  }

  public override async restartScheduledDelayedEvent(delayId: string): Promise<void> {
    await (this.client as any)._unstable_restartScheduledDelayedEvent(delayId);
  }

  public override async sendScheduledDelayedEvent(delayId: string): Promise<void> {
    await (this.client as any)._unstable_sendScheduledDelayedEvent(delayId);
  }

  public override async sendToDevice(
    eventType: string,
    encrypted: boolean,
    contentMap: { [userId: string]: { [deviceId: string]: object } },
  ): Promise<void> {
    if (encrypted) {
      const crypto = this.client.getCrypto();
      if (!crypto) {
        throw new Error('Encryption is not enabled for this client');
      }

      const inverted: Record<string, { userId: string; deviceId: string }[]> = {};
      for (const [userId, devices] of Object.entries(contentMap)) {
        for (const [deviceId, payload] of Object.entries(devices)) {
          const key = JSON.stringify(payload);
          if (!inverted[key]) {
            inverted[key] = [];
          }
          inverted[key].push({ userId, deviceId });
        }
      }

      await Promise.all(
        Object.entries(inverted).map(async ([payloadString, recipients]) => {
          const payload = JSON.parse(payloadString);
          const batch = await crypto.encryptToDeviceMessages(eventType, recipients, payload);
          await this.client.queueToDevice(batch);
        }),
      );

      return;
    }

    const batch = Object.entries(contentMap).flatMap(([userId, devices]) =>
      Object.entries(devices).map(([deviceId, payload]) => ({
        userId,
        deviceId,
        payload,
      })),
    );

    await this.client.queueToDevice({ eventType, batch });
  }

  public override async readRoomTimeline(
    roomId: string,
    eventType: string,
    msgtype: string | undefined,
    stateKey: string | undefined,
    limit: number,
    since: string | undefined,
  ): Promise<IRoomEvent[]> {
    const room = this.client.getRoom(roomId);
    if (!room) return [];

    const events = room
      .getLiveTimeline()
      .getEvents()
      .filter((event) => {
        if (event.getType() !== eventType) return false;
        if (stateKey !== undefined && event.getStateKey() !== stateKey) return false;
        if (msgtype && event.getContent()?.msgtype !== msgtype) return false;
        if (since && since !== event.getId()) return false;
        return true;
      });

    const sliceLimit = limit > 0 ? limit : events.length;
    return events.slice(-sliceLimit).map((event) => toRoomEvent(event, roomId));
  }

  public override async readRoomState(
    roomId: string,
    eventType: string,
    stateKey: string | undefined,
  ): Promise<IRoomEvent[]> {
    const room = this.client.getRoom(roomId);
    if (!room) return [];

    if (stateKey !== undefined) {
      const event = room.currentState.getStateEvents(eventType, stateKey);
      return event ? [toRoomEvent(event, roomId)] : [];
    }

    const events = room.currentState.getStateEvents(eventType) ?? [];
    return events.map((event) => toRoomEvent(event, roomId));
  }

  public override async *getTurnServers(): AsyncGenerator<ITurnServer> {
    while (!this.isDisposed) {
      try {
        const result = (await this.client.turnServer()) as TurnServerCredentials | null;
        if (result?.uris?.length) {
          yield {
            uris: result.uris,
            username: result.username,
            password: result.password,
          };

          const ttlMs = (result.ttl ?? 3600) * 1000;
          await new Promise((resolve) => setTimeout(resolve, Math.max(ttlMs - 60_000, 30_000)));
          continue;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[ElementCallWidgetDriver] Failed to fetch TURN servers', error);
      }

      await new Promise((resolve) => setTimeout(resolve, 60_000));
    }
  }

  public override askOpenID(observer: SimpleObservable<IOpenIDUpdate>): void {
    observer.update({ state: OpenIDRequestState.PendingUserConfirmation });

    this.client
      .getOpenIdToken()
      .then((token: IOpenIDCredentials) => {
        observer.update({
          state: OpenIDRequestState.Allowed,
          token,
        });
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('[ElementCallWidgetDriver] Failed to get OpenID token', error);
        observer.update({ state: OpenIDRequestState.Blocked });
      });
  }

  public override getKnownRooms(): string[] {
    return [this.room.roomId];
  }
}

export const ELEMENT_CALL_WIDGET_TYPE = 'io.element.call' as const;


