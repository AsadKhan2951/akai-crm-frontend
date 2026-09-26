/** Instant placeholder shown while a portal page loads on the server. */
export function PageSkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "list" }) {
  const block = "rounded-[10px] bg-[#ebeae5]";
  return (
    <div aria-busy="true" aria-live="polite" className="flex animate-pulse flex-col gap-5">
      <div className="flex flex-col gap-2"><div className={`h-7 w-56 ${block}`} /><div className={`h-4 w-80 max-w-full ${block}`} /></div>
      {variant === "dashboard" ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={`h-[104px] ${block}`} />)}</div>
          <div className="grid gap-4 xl:grid-cols-3"><div className={`h-72 xl:col-span-2 ${block}`} /><div className={`h-72 ${block}`} /></div>
        </>
      ) : (
        <>
          <div className={`h-10 w-full max-w-xl ${block}`} />
          <div className="flex flex-col gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className={`h-12 ${block}`} />)}</div>
        </>
      )}
    </div>
  );
}
