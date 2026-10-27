"use client";
export default function Error({ reset }) {
  return (<div role="alert" className="card animate-fade-up max-w-xl border-red-200 bg-red-50 p-6"><p className="font-semibold">This page couldn't load.</p>
    <p className="mt-1 text-muted">We couldn't reach the database. Check your connection and try again. Your data is safe.</p>
    <button onClick={reset} className="btn btn-primary mt-4">Try again</button></div>);
}
