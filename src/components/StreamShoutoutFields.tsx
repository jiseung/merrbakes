"use client";
import { shoutoutCopy as copy } from "@/content/shoutout";
import { STREAM_NAME_MAX } from "@/lib/streamAlert";

// Name shown in Merr's on-stream alert for this order: what they type here,
// else their first name from Stripe, or "Anonymous" when the box is ticked
// (resolved in src/lib/streamAlert.ts). Ticking the box swaps the field's text
// for "Anonymous"; unticking brings back what they'd typed.
// Styling comes from the host form so it matches the cart drawer and /club.
type Props = {
  name: string;
  onNameChange: (value: string) => void;
  anonymous: boolean;
  onAnonymousChange: (value: boolean) => void;
  inputClassName: string;
  labelClassName: string;
  hintClassName: string;
};

export default function StreamShoutoutFields(p: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className={p.labelClassName}>{copy.nameLabel}</label>
        <input type="text" maxLength={STREAM_NAME_MAX} disabled={p.anonymous} autoComplete="given-name"
               value={p.anonymous ? copy.anonymousName : p.name} placeholder={copy.namePlaceholder}
               onChange={(e) => p.onNameChange(e.target.value)}
               className={`${p.inputClassName} disabled:opacity-60`} />
        {!p.anonymous && <p className={p.hintClassName}>{copy.nameHint}</p>}
      </div>
      <label className={`${p.hintClassName} flex items-center gap-2`}>
        <input type="checkbox" checked={p.anonymous} onChange={(e) => p.onAnonymousChange(e.target.checked)} />
        {copy.anonymousLabel}
      </label>
    </div>
  );
}
