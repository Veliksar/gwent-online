import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import apiClient, { registerSocketId } from '../api/client'

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

window.Pusher = Pusher

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EchoInstance = Echo<any>

let instance: EchoInstance | null = null

function resolveReverbHost(): string {
  if (import.meta.env.DEV) {
    return window.location.hostname
  }

  return import.meta.env.VITE_REVERB_HOST as string
}

export function getEcho(): EchoInstance {
  if (!instance) {
    instance = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY as string,
      wsHost: resolveReverbHost(),
      wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
      wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
      enabledTransports: ['ws', 'wss'],
      authorizer: (channel: { name: string }) => ({
        authorize: (
          socketId: string,
          callback: (error: Error | null, data: unknown) => void,
        ) => {
          apiClient
            .post('/broadcasting/auth', {
              socket_id: socketId,
              channel_name: channel.name,
            }, { baseURL: '' })
            .then((response) => callback(null, response.data))
            .catch((error: Error) => callback(error, null))
        },
      }),
    })

    instance.connector.pusher.connection.bind('connected', () => {
      registerSocketId(instance?.socketId() ?? null)
    })
    instance.connector.pusher.connection.bind('disconnected', () => {
      registerSocketId(null)
    })
  }
  return instance
}

export function disconnectEcho(): void {
  if (instance) {
    instance.disconnect()
    instance = null
    registerSocketId(null)
  }
}
