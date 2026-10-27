export default function Loading() {
  return (<div className="space-y-4" aria-busy="true" aria-label="Loading"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}</div><div className="skeleton h-72" /></div>);
}
