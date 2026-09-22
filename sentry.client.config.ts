import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user) delete event.user;
      if (event.request) { delete event.request.headers; delete event.request.cookies; delete event.request.data; }
      return event;
    },
  });
}
