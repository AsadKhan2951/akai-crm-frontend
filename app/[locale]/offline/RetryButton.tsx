"use client";

export function RetryButton({ label }: { label: string }) {
  return (
    <button type="button" className="mt-5 min-h-11 rounded-md bg-primary px-4 font-semibold text-white" onClick={() => window.location.reload()}>
      {label}
    </button>
  );
}
