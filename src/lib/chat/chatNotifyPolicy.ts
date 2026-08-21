export type ChatNotifyDirection = 'incoming' | 'outgoing';

export type ChatNotifyInput = {
  direction?: ChatNotifyDirection | string | null;
  conversacionId?: string | null;
  activeConversacionId?: string | null;
  pageVisible: boolean;
};

export function shouldAlertIncomingMessage(input: ChatNotifyInput): boolean {
  const direction = input.direction === 'outgoing' ? 'outgoing' : 'incoming';
  if (direction === 'outgoing') return false;
  if (input.pageVisible && input.conversacionId && input.activeConversacionId === input.conversacionId) {
    return false;
  }
  return true;
}

export function shouldPlayIncomingSound(input: Pick<ChatNotifyInput, 'direction'>): boolean {
  return input.direction !== 'outgoing';
}
