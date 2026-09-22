"use client";

import { RouteErrorView } from "@/components/RouteErrorView";

export default function SalesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorView reset={reset} />;
}
