//https://dev.twitch.tv/docs/embed/everything/#programmatic-access:~:text=body%3E%0A%3C/html%3E-,Embed%20Parameters,-Option
interface TwitchEmbedOptions {
  allowfullscreen?: boolean;
  autoplay?: boolean;
  channel?: string;
  collection?: string;
  height?: number | string;
  layout?: string;
  muted?: boolean;
  parent?: string[];
  theme?: string;
  time?: string;
  video?: string;
  width?: number | string;
}

interface Twitch {
  Embed: new (elementId: string, options: TwitchEmbedOptions) => void;
}

interface Window {
  Twitch: Twitch;
}