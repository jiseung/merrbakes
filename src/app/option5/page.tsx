"use client";
import { useState, useEffect } from 'react';
import KofiItem from "@/components/KofiItem";
import MailingListItem from "@/components/MailingListItem";
import { KofiItemType } from "@/app/api/types";

const recipes = [
  {
    name: "Fudgy Brownies",
    emoji: "🍫",
    time: "45 min",
    difficulty: "easy",
    tip: "The secret is pulling them out when the toothpick comes out with a few crumbs — not clean. They firm up as they cool.",
    ingredients: ["butter", "sugar", "eggs", "cocoa powder", "flour", "vanilla", "salt"],
  },
  {
    name: "Oatmeal Chocolate Chip Cookies",
    emoji: "🍪",
    time: "30 min",
    difficulty: "easy",
    tip: "Chill the dough for at least 30 minutes before baking. It stops spreading and makes them chewy in the middle.",
    ingredients: ["oats", "butter", "brown sugar", "egg", "flour", "chocolate chips", "cinnamon"],
  },
  {
    name: "Banana Nut Bread",
    emoji: "🍌",
    time: "1 hr 15 min",
    difficulty: "easy",
    tip: "Use bananas that are almost entirely black. The riper, the sweeter and more flavorful your bread.",
    ingredients: ["overripe bananas", "butter", "sugar", "egg", "flour", "baking soda", "walnuts"],
  },
];

export default function Option5() {
  const [kofiItems, setKofiItems] = useState<KofiItemType[]>([]);
  const [openRecipe, setOpenRecipe] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/kofi', { cache: 'no-store' }).then(r => r.json()).then(d => setKofiItems(d.data ?? []));
  }, []);

  return (
    <main className="min-h-screen bg-merrbakes-pink font-hand">
      <header className="text-center py-12 text-merrbakes-brown">
        <h1 className="text-7xl">merrbakes</h1>
        <p className="text-xl mt-2 italic">watch it made · buy the finished thing · learn to make it yourself</p>
      </header>

      {/* Three pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-0 border-y-4 border-merrbakes-brown">
        <a
          href="https://twitch.tv/merrbakes"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center p-10 bg-[#9146ff] text-white text-center gap-3
                     border-b-4 md:border-b-0 md:border-r-2 border-merrbakes-brown hover:opacity-90 transition min-h-48"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-14 h-14" viewBox="0 0 16 16">
            <path d="M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142z"/>
          </svg>
          <span className="text-3xl">watch</span>
          <span className="text-white/70 text-lg">live on twitch</span>
        </a>
        <a
          href="https://ko-fi.com/merrbakes/shop"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center p-10 bg-merrbakes-yellow text-merrbakes-brown text-center gap-3
                     border-b-4 md:border-b-0 md:border-r-2 border-merrbakes-brown hover:opacity-90 transition min-h-48"
        >
          <span className="text-5xl">🛒</span>
          <span className="text-3xl">buy</span>
          <span className="text-merrbakes-brown/70 text-lg">ko-fi shop</span>
        </a>
        <button
          onClick={() => document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex flex-col items-center justify-center p-10 bg-merrbakes-blue text-merrbakes-gray text-center gap-3
                     hover:opacity-90 transition min-h-48"
        >
          <span className="text-5xl">📖</span>
          <span className="text-3xl">learn</span>
          <span className="text-merrbakes-gray/70 text-lg">tips & recipes</span>
        </button>
      </section>

      {/* Shop items */}
      <section className="p-8">
        <h2 className="text-3xl text-merrbakes-brown mb-6 text-center">currently in the shop</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {kofiItems.map((item, i) => (
            <KofiItem key={i} item={item} />
          ))}
        </div>
      </section>

      {/* Recipes section */}
      <section id="learn" className="p-8 bg-merrbakes-yellow/50">
        <h2 className="text-4xl text-merrbakes-brown text-center mb-2">tips from the kitchen</h2>
        <p className="text-center text-merrbakes-brown/60 italic mb-8">a few of merr's secrets — try them at home</p>
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {recipes.map((recipe, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-merrbakes-brown overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-6 text-left hover:bg-merrbakes-pink/30 transition"
                onClick={() => setOpenRecipe(openRecipe === i ? null : i)}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{recipe.emoji}</span>
                  <div>
                    <h3 className="text-2xl text-merrbakes-brown">{recipe.name}</h3>
                    <p className="text-merrbakes-lightgray text-sm">{recipe.time} · {recipe.difficulty}</p>
                  </div>
                </div>
                <span className="text-merrbakes-brown text-2xl">{openRecipe === i ? '▲' : '▼'}</span>
              </button>
              {openRecipe === i && (
                <div className="px-6 pb-6 border-t border-merrbakes-brown/20">
                  <div className="flex flex-col md:flex-row gap-6 pt-4">
                    <div className="flex-1">
                      <p className="text-merrbakes-brown/60 text-xs uppercase tracking-widest mb-2">ingredients</p>
                      <ul className="text-merrbakes-brown text-lg space-y-1">
                        {recipe.ingredients.map(ing => (
                          <li key={ing}>· {ing}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex-1 bg-merrbakes-yellow/50 rounded-xl p-4">
                      <p className="text-merrbakes-brown/60 text-xs uppercase tracking-widest mb-2">merr's tip</p>
                      <p className="text-merrbakes-brown italic text-lg leading-relaxed">"{recipe.tip}"</p>
                    </div>
                  </div>
                  <a
                    href="https://ko-fi.com/merrbakes/shop"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-4 text-merrbakes-brown underline hover:no-underline text-lg"
                  >
                    rather buy the finished thing? →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="text-center py-4 text-merrbakes-brown italic px-8">
        <p className="text-xl mb-2">get new recipes + shop drops in your inbox</p>
      </section>
      <MailingListItem />
    </main>
  );
}
