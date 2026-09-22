export type CalendarEvent = {
  uid: string;
  summary: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
};

export interface CalendarProvider {
  createEvent(event: CalendarEvent): Promise<{ uid: string }>;
  updateEvent(uid: string, event: CalendarEvent): Promise<{ uid: string }>;
  deleteEvent(uid: string): Promise<void>;
}

export class IcsCalendarProvider implements CalendarProvider {
  async createEvent(event: CalendarEvent) { return { uid: event.uid }; }
  async updateEvent(uid: string) { return { uid }; }
  async deleteEvent(uid: string) { if (!uid) return; return undefined; }
}
