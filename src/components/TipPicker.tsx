"use client";
import { tipsCopy as copy } from "@/content/tips";

// Optional tip for Merr, added to the Stripe checkout as its own line
// (src/lib/tips.ts). `cents` is 0 for no tip. Styling comes from the host form
// so it matches the cart drawer and /club, same as StreamShoutoutFields.
type Props = {
  cents: number;
  onCentsChange: (value: number) => void;
  note: string;
  onNoteChange: (value: string) => void;
  inputClassName: string;
  labelClassName: string;
  chipClassName: (selected: boolean) => string;
};

export default function TipPicker(p: Props) {
  const isPreset = p.cents === 0 || copy.presets.some((d) => d * 100 === p.cents);
  return (
    <div className="flex flex-col gap-2">
      <label className={p.labelClassName}>{copy.label}</label>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => p.onCentsChange(0)} className={p.chipClassName(p.cents === 0)}>{copy.none}</button>
        {copy.presets.map((d) => (
          <button key={d} type="button" onClick={() => p.onCentsChange(d * 100)} className={p.chipClassName(p.cents === d * 100)}>${d}</button>
        ))}
        <label className={`${p.chipClassName(!isPreset)} flex items-center gap-1`}>
          <span>{copy.other} $</span>
          <input type="number" min={1} max={500} step={1} inputMode="numeric" placeholder={copy.otherPlaceholder}
                 value={isPreset ? "" : p.cents / 100}
                 onChange={(e) => p.onCentsChange(Math.max(0, Math.round(Number(e.target.value) * 100) || 0))}
                 className="w-20 bg-transparent outline-none" />
        </label>
      </div>
      {p.cents > 0 && (
        <div>
          <label className={p.labelClassName}>{copy.noteLabel}</label>
          <textarea value={p.note} maxLength={450} rows={2} onChange={(e) => p.onNoteChange(e.target.value)}
                    className={`${p.inputClassName} rounded-2xl resize-none`} />
        </div>
      )}
    </div>
  );
}
