"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const faqs: FAQItem[] = [
  {
    q: "Do you actually test products yourself?",
    a: "No — and we're explicit about that. Our editorial model is expert synthesis, not personal review. We read 20+ expert sources per category — vet schools, peer-reviewed durability studies, and tested reviews from publications like Tropical Fish Magazine, Reptiles Magazine, and Cornell Lab of Ornithology — then identify where professional opinion genuinely converges. That's the moat AI-generated content can't shortcut.",
  },
  {
    q: "How is the PetPal Gear Score calculated?",
    a: "Every product is scored 0–10 on five fixed pillars: Expert Consensus (30%), Effectiveness (25%), Animal Safety (20%), Durability (15%), and Value (10%). The weighted composite produces the score. Scores below 6.0 we label \"Skip\"; 9.0+ earns our \"Must Buy\" verdict. The full methodology is at /methodology.",
  },
  {
    q: "What pet verticals do you cover?",
    a: "We launch with three: aquarium (water quality, filtration, care), reptile (habitat, lighting, heat), and birds (smart feeders, backyard birding gear). The brand identity supports future expansion to small mammals, amphibians, and pet-bird (parrot/cage) verticals as research depth justifies it.",
  },
  {
    q: "How often are scores and prices updated?",
    a: "Every guide gets a price and availability sweep on a rolling 90-day cycle. When new expert sources publish reviews of a product we cover, scores are recalculated. Significant changes (a product fails its safety claim, gets discontinued, or gains a major upgrade) trigger immediate re-review.",
  },
  {
    q: "How do you make money?",
    a: "Amazon Associates affiliate commissions on qualifying purchases through our links. The funding pays for the editorial work — hours of source reading per guide. Commission rates never influence our recommendations: if a product isn't worth it, we say so, even if it would have earned us a commission. Full disclosure at /affiliate-disclosure.",
  },
  {
    q: "Why \"expert consensus\" instead of \"we tested it\"?",
    a: "Because synthesis is what we actually do well, and testing claims we can't substantiate are an FTC scrutiny risk. Wirecutter's testing infrastructure costs millions; pretending we have it would be dishonest and legally risky. Our advantage is reading every expert source so you don't have to.",
  },
];

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b last:border-b-0"
      style={{ borderColor: "var(--border)" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <span
          className="text-base md:text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {item.q}
        </span>
        <ChevronDown
          className="w-5 h-5 shrink-0 transition-transform"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div
          className="pb-5 pr-9 leading-relaxed text-sm md:text-base"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {item.a}
        </div>
      )}
    </div>
  );
}

export function HomepageFAQ() {
  return (
    <section className="py-20 md:py-24" style={{ background: "var(--color-parchment)" }}>
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-12">
          <h2
            className="mb-3"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              lineHeight: 1.2,
              fontWeight: 700,
            }}
          >
            Pet Care Questions, Answered
          </h2>
          <p
            className="text-base"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Quick answers backed by expert consensus data.
          </p>
        </div>

        <div
          className="rounded-2xl px-6 md:px-8"
          style={{
            background: "var(--color-card-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {faqs.map((item) => (
            <FAQRow key={item.q} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
