export default function Loading() {
  return (
    <main className="min-h-[70vh] bg-[#f4f7fb] px-5 py-16" aria-busy="true" aria-label="Loading RLCA page">
      <div className="mx-auto max-w-7xl">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-5 h-14 max-w-2xl" />
        <div className="skeleton mt-4 h-5 max-w-xl" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton h-44" />)}
        </div>
      </div>
    </main>
  );
}
