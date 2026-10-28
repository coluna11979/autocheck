import { useId } from "react";
export function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  min,
  max,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        type={type}
        step={type === "number" ? "any" : undefined}
        required={required}
        min={min}
        max={max}
        maxLength={type === "text" ? 200 : undefined}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Notes({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        maxLength={5000}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="builder-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function RuleList({
  label,
  values,
  onCommit,
}: {
  label: string;
  values: string[];
  onCommit: (v: string[]) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        key={values.join("|")}
        defaultValue={values.join(", ")}
        maxLength={2000}
        onBlur={(e) =>
          onCommit(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </div>
  );
}
