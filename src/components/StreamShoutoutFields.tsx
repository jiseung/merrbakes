"use client";
import { shoutoutCopy as copy } from "@/content/shoutout";

// Name shown in Merr's on-stream alert for this order: Twitch handle if given,
// else first name, or "Anonymous" (resolved in src/lib/streamAlert.ts).
// Styling comes from the host form so it matches the cart drawer and /club.
type Props = {
  twitchHandle: string;
  onTwitchHandleChange: (value: string) => void;
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
        <label className={p.labelClassName}>{copy.twitchLabel}</label>
        <input type="text" value={p.twitchHandle} maxLength={26} disabled={p.anonymous}
               autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={copy.twitchPlaceholder}
               onChange={(e) => p.onTwitchHandleChange(e.target.value)}
               className={`${p.inputClassName} disabled:opacity-50`} />
        {!p.anonymous && <p className={p.hintClassName}>{copy.twitchHint}</p>}
      </div>
      <label className={`${p.hintClassName} flex items-center gap-2`}>
        <input type="checkbox" checked={p.anonymous} onChange={(e) => p.onAnonymousChange(e.target.checked)} />
        {copy.anonymousLabel}
      </label>
    </div>
  );
}
