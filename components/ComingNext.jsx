export default function ComingNext({ phase, note }) {
    return (<div className="max-w-xl rounded-xl border border-dashed border-line bg-white p-6"><p className="font-medium">Built in {phase}</p><p className="mt-1 text-muted">{note}</p></div>);
}
