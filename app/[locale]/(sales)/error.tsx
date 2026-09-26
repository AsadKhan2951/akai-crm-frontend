"use client";

import { RouteErrorView } from "@/components/RouteErrorView";

export default function SalesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorView reset={reset} digest={error.digest} />;
}
