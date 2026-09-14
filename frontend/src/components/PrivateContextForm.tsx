type Props = {
  label: string;
  value: string;
  onLabel: (v: string) => void;
  onValue: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
};

/** Presentational only — data fetching lives in the Connect page. */
export function PrivateContextForm({ label, value, onLabel, onValue, onSave, saving, saved, disabled }: Props) {
  const locked = saving || disabled;
  return (
    <div className="rounded-3xl border-2 border-dashed border-black bg-neutral-50 p-6">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
        Connected resource — visible to CEO only
      </p>
      <label className="mb-3 block rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Label
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => onLabel(e.target.value)}
          disabled={locked}
          placeholder="GitHub repo"
          className="w-full bg-transparent text-[15px] font-medium focus:outline-none disabled:opacity-60"
        />
      </label>
      <label className="block rounded-2xl bg-white p-4 ring-1 ring-neutral-200">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Value (stored as plain text)
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          disabled={locked}
          placeholder="https://github.com/… or API key"
          className="w-full bg-transparent text-[15px] font-medium focus:outline-none disabled:opacity-60"
        />
      </label>
      {saved ? (
        <p className="mt-4 rounded-full bg-black px-4 py-2 text-center font-mono text-[11px] uppercase tracking-widest text-white">
          ✓ Saved to CEO-only store
        </p>
      ) : (
        <button
          onClick={onSave}
          disabled={locked || !label.trim() || !value.trim()}
          className="mt-4 w-full rounded-full bg-black px-8 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-500"
        >
          {saving ? "Saving..." : "Save securely"}
        </button>
      )}
    </div>
  );
}
