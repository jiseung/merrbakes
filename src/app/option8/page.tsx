import MailingListItem from "@/components/MailingListItem";
import { reviews } from "@/content/reviews";

const socials = [
  { label: 'twitch', handle: 'merrbakes', href: 'https://twitch.tv/merrbakes', color: 'hover:text-[#9146ff]' },
  { label: 'ko-fi shop', handle: 'ko-fi.com/merrbakes', href: 'https://ko-fi.com/merrbakes', color: 'hover:text-[#FF5E5B]' },
  { label: 'discord', handle: 'the merringue gang', href: 'https://discord.gg/uRAWAWMQKU', color: 'hover:text-[#5865f2]' },
  { label: 'instagram', handle: '@merrbakes', href: 'https://www.instagram.com/MerrBakes', color: 'hover:text-[#c32aa3]' },
  { label: 'twitter / x', handle: '@merrbakes', href: 'https://twitter.com/MerrBakes', color: 'hover:text-black' },
  { label: 'tiktok', handle: '@merrbakes', href: 'https://www.tiktok.com/@merrbakes', color: 'hover:text-[#69c9d0]' },
];

export default function Option8() {
  return (
    <main className="min-h-screen bg-merrbakes-pink font-hand">
      {/* Personal intro */}
      <section className="max-w-2xl mx-auto px-8 pt-20 pb-12 text-center">
        <video
          className="w-40 h-40 mx-auto mb-6 rounded-full object-cover"
          autoPlay
          muted
          playsInline
          loop
        >
          <source src="/logo.mp4" type="video/mp4" />
        </video>
        <h1 className="text-7xl text-merrbakes-brown mb-6">merrbakes</h1>
        <div className="text-merrbakes-brown text-xl leading-relaxed space-y-4 text-left">
          <p>
            hey! i'm merr — a baker, streamer, and lover of anything chocolate. i bake live on twitch,
            ship treats to people who order from my ko-fi shop, and hang out with the best community
            on the internet.
          </p>
          <p>
            everything i make is handmade in small batches. i care a lot about what goes into the box —
            the bakes, the packaging, all of it. when you get something from me, you know exactly who made it.
          </p>
          <p>
            that's kind of the whole point.
          </p>
        </div>
      </section>

      {/* Find me here */}
      <section className="max-w-2xl mx-auto px-8 py-10 border-t border-merrbakes-brown/30">
        <h2 className="text-3xl text-merrbakes-brown mb-6">here's where to find me</h2>
        <div className="flex flex-col gap-3">
          {socials.map(({ label, handle, href, color }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className={`flex items-baseline justify-between border-b border-merrbakes-brown/20 pb-3 text-merrbakes-brown transition ${color}`}
            >
              <span className="text-2xl">{label}</span>
              <span className="text-lg text-merrbakes-brown/60 italic">{handle}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Shop CTA */}
      <section className="max-w-2xl mx-auto px-8 py-10 border-t border-merrbakes-brown/30">
        <h2 className="text-3xl text-merrbakes-brown mb-3">here's what i make</h2>
        <p className="text-merrbakes-brown/70 italic text-xl mb-6">
          brownies, cookies, breads — small batches, shipped with care.
        </p>
        <a
          href="https://ko-fi.com/merrbakes/shop"
          target="_blank"
          rel="noreferrer"
          className="inline-block bg-merrbakes-brown text-merrbakes-yellow px-8 py-3 rounded-lg text-2xl hover:opacity-80 transition"
        >
          visit the shop →
        </a>
      </section>

      {/* Letter-style reviews */}
      <section className="max-w-2xl mx-auto px-8 py-10 border-t border-merrbakes-brown/30">
        <h2 className="text-3xl text-merrbakes-brown mb-8">letters from the community</h2>
        <div className="flex flex-col gap-8">
          {reviews.slice(0, 6).map((r, i) => (
            <div
              key={i}
              className="bg-white/80 rounded-lg p-8 shadow-md border border-merrbakes-brown/20 relative"
              style={{ transform: `rotate(${i % 2 === 0 ? '-0.5deg' : '0.5deg'})` }}
            >
              {/* Wax seal */}
              <div className="absolute -top-4 right-6 w-10 h-10 bg-merrbakes-brown rounded-full flex items-center justify-center text-merrbakes-yellow text-lg shadow">
                ✦
              </div>
              <p className="text-merrbakes-brown italic text-lg leading-relaxed">
                {r.content}
              </p>
              <p className="mt-4 text-merrbakes-brown/60 text-right">— {r.author}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-8 py-10 border-t border-merrbakes-brown/30 text-center">
        <p className="text-merrbakes-brown text-xl italic mb-2">want to hear when new batches drop?</p>
      </section>
      <MailingListItem />
    </main>
  );
}
