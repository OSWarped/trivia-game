// reliable-handshake.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Socket } from 'socket.io-client';

/**
 * Client-side reliable emit hook.
 * Wraps socket.emit with ack timeout, retry, and idempotency.
 */
export function useReliableEmit(
  socket: Socket,
  options: { timeoutMs?: number; maxRetries?: number } = {}
) {
  const { timeoutMs = 3000, maxRetries = 3 } = options;

  return useCallback(
    (
      eventName: string,
      payload: Record<string, any>,
      onSuccess?: (response: any) => void,
      onError?: (err: any) => void
    ) => {
      const messageId = uuidv4();
      let attempts = 0;

      const attemptEmit = () => {
        attempts++;
        socket.timeout(timeoutMs).emit(
          eventName,
          { ...payload, messageId },
          (err: any, response: any) => {
            if (err) {
              if (attempts < maxRetries) {
                setTimeout(attemptEmit, timeoutMs);
              } else {
                onError?.(err);
              }
            } else {
              onSuccess?.(response);
            }
          }
        );
      };

      attemptEmit();
    },
    [socket, timeoutMs, maxRetries]
  );
}

/**
 * Server-side helper to register handlers with idempotency and ack.
 *
 * @param io - Socket.IO server instance
 * @param eventName - name of the event to handle
 * @param handler - function(socket, data) to process valid messages
 */
export function registerReliableHandler(
  io: any,
  eventName: string,
  handler: (socket: any, data: any) => Promise<any> | void
) {
  const processed = new Set<string>();

  io.on('connection', (socket: any) => {
    socket.on(eventName, async (data: any, ack: (res: any) => void) => {
      const { messageId, ...rest } = data;
      if (processed.has(messageId)) {
        return ack({ success: true });
      }
      processed.add(messageId);

      try {
        const result = await handler(socket, rest);
        ack({ success: true, ...(result || {}) });
      } catch (err: any) {
        ack({ success: false, error: err.message });
      }
    });
  });
}

// Usage (client):
// const reliableEmit = useReliableEmit(socket);
// reliableEmit(
//   'host:nextQuestion',
//   { gameId, round },
//   (res) => console.log('delivered', res),
//   (err) => console.error('failed', err)
// );

// Usage (server):
// registerReliableHandler(io, 'host:nextQuestion', async (socket, { gameId, round }) => {
//   // process next question here
//   // return any extra data for client if needed
// });
