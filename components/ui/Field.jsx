/** Label + control + error. Use as="div" for custom controls that carry their own aria-label. */
export default function Field({ label, error, as: Tag = "label", className = "", children }) {
  return (<Tag className={`block ${className}`}><span className="lbl">{label}</span>{children}{error && <p role="alert" className="mt-1 text-sm text-red-600">{error.message ?? error}</p>}</Tag>);
}
