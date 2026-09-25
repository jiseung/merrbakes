"use client";
import { shoutoutCopy as copy } from "@/content/shoutout";
import { STREAM_NAME_MAX } from "@/lib/streamAlert";

// Name shown in Merr's on-stream alert for this order: what they type here, or
// "Anonymous" when left blank (resolved in src/lib/streamAlert.ts).
// Styling comes from the host form so it matches the cart drawer and /club.
type Props = {
  name: string;
  onNameChange: (value: string) => void;
  inputClassName: string;
  labelClassName: string;
};

export default function StreamShoutoutFields(p: Props) {
  return (
    <div>
      <label className={p.labelClassName}>{copy.nameLabel}</label>
      <input type="text" maxLength={STREAM_NAME_MAX} autoComplete="nickname"
             value={p.name} placeholder={copy.namePlaceholder}
             onChange={(e) => p.onNameChange(e.target.value)}
             className={p.inputClassName} />
    </div>
  );
}
