import MailingListItem from "@/components/MailingListItem";
import { reviews } from "@/content/reviews";

const menuSections = [
  {
    category: "Brownies",
    items: [
      { name: "Cosmic Brownie", desc: "Fudgy, rich, topped with rainbow chips" },
      { name: "Walnut Brownie", desc: "Classic brownie studded with toasted walnuts" },
    ],
  },
  {
    category: "Cookies",
    items: [
      { name: "Oatmeal Chocolate Chip", desc: "Hearty oats, melty chips, pure comfort" },
      { name: "Pridelines", desc: "A colorful seasonal fan favorite" },
    ],
  },
  {
    category: "Breads & Seasonal",
    items: [
      { name: "Banana Nut Bread", desc: "Moist crumb, ripe bananas, crunchy walnuts" },
      { name: "Seasonal Special", desc: "Ask in the shop — changes with the season!" },
    ],
  },
];

export default function Option2() {
  return (
    <main className="min-h-screen bg-merrbakes-yellow font-hand">
      <header className="text-center py-12 border-b-[6px] border-double border-merrbakes-brown">
        <p className="text-merrbakes-brown tracking-[0.3em] text-sm mb-2 uppercase">est. with love</p>
        <h1 className="text-7xl text-merrbakes-brown">merrbakes</h1>
        <p className="text-merrbakes-brown text-xl mt-3 italic">handmade to order · shipped with love</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 p-8 max-w-6xl mx-auto">
        <div className="flex-1 border-4 border-dashed border-merrbakes-brown rounded-lg p-8 bg-white/70">
          {menuSections.map((section) => (
            <div key={section.category} className="mb-10">
              <h2 className="text-3xl text-merrbakes-brown border-b-2 border-merrbakes-brown pb-2 mb-5">
                ✦ {section.category}
              </h2>
              {section.items.map((item) => (
                <div key={item.name} className="mb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl text-merrbakes-brown shrink-0">{item.name}</span>
                    <span className="flex-1 border-b border-dotted border-merrbakes-brown/40 mb-1" />
                    <a
                      href="https://ko-fi.com/merrbakes/shop"
                      target="_blank"
                      rel="noreferrer"
                      className="text-merrbakes-brown text-sm shrink-0 hover:underline"
                    >
                      see shop →
                    </a>
                  </div>
                  <p className="text-merrbakes-lightgray text-sm italic ml-2 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          ))}
          <a
            href="https://ko-fi.com/merrbakes/shop"
            target="_blank"
            rel="noreferrer"
            className="block text-center bg-merrbakes-brown text-merrbakes-yellow px-6 py-3 rounded-lg text-2xl hover:opacity-80 transition"
          >
            browse the full menu on ko-fi →
          </a>
        </div>

        <div className="lg:w-80 shrink-0">
          <div className="border-4 border-dashed border-merrbakes-brown rounded-lg p-6 bg-white/70 lg:sticky lg:top-6">
            <h2 className="text-2xl text-merrbakes-brown text-center mb-4 border-b border-merrbakes-brown pb-2">
              what our regulars say
            </h2>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[65vh]">
              {reviews.slice(0, 8).map((r, i) => (
                <div key={i} className="bg-merrbakes-pink p-4 rounded-lg">
                  <p className="text-sm text-merrbakes-brown italic leading-relaxed">"{r.content}"</p>
                  <p className="text-xs text-merrbakes-brown/60 mt-2 text-right">— {r.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center py-4 text-merrbakes-brown/60 text-sm italic">
        ✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
      </div>
      <div className="max-w-xl mx-auto mb-12 px-4">
        <p className="text-center text-merrbakes-brown text-xl mb-2">leave your email, we'll save you a seat</p>
        <MailingListItem />
      </div>
    </main>
  );
}
