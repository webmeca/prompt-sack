type SyncMessage =
  | {
      type: 'ui-state';
      originId: string;
      payload: {
        selectedPromptId?: string | null;
        selectedCollectionId?: string | null;
        searchQuery?: string;
        isSidebarOpen?: boolean;
      };
    }
  | {
      type: 'workspace-updated';
      originId: string;
      payload: {
        reason: 'theme-change' | 'theme-registry-change' | 'workspace-import';
      };
    };

const originId = crypto.randomUUID();
const channelName = 'prompt-ledger-workspace-sync';
const fallbackEventName = '__prompt_ledger_sync__';

let channel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel(channelName);
}

function emitFallback(message: SyncMessage) {
  window.localStorage.setItem(fallbackEventName, JSON.stringify({ ...message, sentAt: Date.now() }));
  window.localStorage.removeItem(fallbackEventName);
}

export function publishSyncMessage(message: Omit<SyncMessage, 'originId'>) {
  const fullMessage: SyncMessage = {
    ...message,
    originId,
  } as SyncMessage;

  if (channel) {
    channel.postMessage(fullMessage);
    return;
  }

  emitFallback(fullMessage);
}

export function subscribeToSyncMessages(listener: (message: SyncMessage) => void) {
  const handleMessage = (message: SyncMessage) => {
    if (message.originId === originId) return;
    listener(message);
  };

  const onBroadcast = (event: MessageEvent<SyncMessage>) => handleMessage(event.data);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== fallbackEventName || !event.newValue) return;
    handleMessage(JSON.parse(event.newValue) as SyncMessage);
  };

  channel?.addEventListener('message', onBroadcast);
  window.addEventListener('storage', onStorage);

  return () => {
    channel?.removeEventListener('message', onBroadcast);
    window.removeEventListener('storage', onStorage);
  };
}
