export type CallContext = { customerId: string; phone: string; label: string; startedAt: number };

export type CallProvider = {
  createTelLink(phone: string): string;
  rememberCall(context: CallContext): void;
  readPendingCall(): CallContext | null;
  clearPendingCall(): void;
};

const storageKey = "akai-crm.pending-call";

export const manualCallProvider: CallProvider = {
  createTelLink(phone) { return `tel:${phone}`; },
  rememberCall(context) { window.sessionStorage.setItem(storageKey, JSON.stringify(context)); },
  readPendingCall() {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    try {
      const context = JSON.parse(raw) as CallContext;
      if (!context.customerId || !context.phone || !context.startedAt || Date.now() - context.startedAt > 12 * 60 * 60 * 1000) return null;
      return context;
    } catch { return null; }
  },
  clearPendingCall() { window.sessionStorage.removeItem(storageKey); },
};
