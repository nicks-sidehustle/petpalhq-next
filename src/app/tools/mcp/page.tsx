import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/schema";

const PAGE_URL = `${SITE_URL}/tools/mcp`;
const PAGE_DESC =
  "Connect your AI assistant to PetPalHQ's expert-consensus pet-gear intelligence: 146 buying guides and 650+ ranked product picks with PetPal Gear Scores, verdicts, comparisons, and buying-guide recommendations — via the Model Context Protocol.";

export const metadata: Metadata = {
  title: "Pet Gear MCP Server — AI Product Intelligence",
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Pet Gear MCP Server — AI Product Intelligence | PetPalHQ",
    description: PAGE_DESC,
    url: PAGE_URL,
    type: "website",
  },
};

const mcpSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${PAGE_URL}#webapp`,
      name: "PetPalHQ MCP Server",
      description:
        "Model Context Protocol server exposing 650+ expert-researched pet-gear picks with PetPal Gear Scores, verdicts, comparisons, and buying guides to AI assistants.",
      url: PAGE_URL,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
      publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "PetPalHQ" },
    },
    {
      "@type": "APIReference",
      name: "PetPalHQ Product Intelligence API",
      description:
        "MCP server providing pet-gear PetPal Gear Scores, verdicts, comparisons, and buying-guide recommendations.",
      url: `${SITE_URL}/api/mcp`,
      provider: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
    },
  ],
};

const tools = [
  {
    name: "search_pet_products",
    title: "Product Search",
    description:
      "Search all product picks by pet category, price, and minimum PetPal Gear Score. Returns top picks with source-linked guide URLs.",
    example: '"quiet aquarium air pump under $30"',
  },
  {
    name: "get_pet_product_verdict",
    title: "Product Verdict",
    description:
      "Get the PetPal Gear Score, verdict, pros/cons, and guide link for any specific product.",
    example: '"Tetra Whisper Air Pump"',
  },
  {
    name: "compare_pet_products",
    title: "Product Comparison",
    description:
      "Side-by-side comparison of 2-4 products on score, price, and pros/cons, with a data-backed winner.",
    example: '"hygger vs Tetra Whisper air pump"',
  },
  {
    name: "get_pet_buying_guide",
    title: "Buying Guide",
    description:
      "Find the most relevant buying guide from our library. Returns top picks and the full guide link.",
    example: '"best litter box for multiple cats"',
  },
];

const CLIENT_CONFIG = `{
  "mcpServers": {
    "petpalhq": {
      "url": "https://petpalhq.com/api/mcp"
    }
  }
}`;

const schemaScript = JSON.stringify(mcpSchema);

export default function McpPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaScript }} />

      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Hero */}
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-teal)" }}
        >
          For AI Assistants
        </p>
        <h1
          className="font-serif text-4xl md:text-5xl font-bold mb-4 leading-tight"
          style={{ color: "var(--color-navy)" }}
        >
          Pet-gear product intelligence, via the Model Context Protocol.
        </h1>
        <p className="text-lg text-[var(--color-navy)]/70 mb-8">
          Connect Claude, Cursor, or any MCP-compatible AI to PetPalHQ&apos;s
          expert-consensus library — 146 buying guides and 650+ ranked product
          picks for dogs, cats, aquariums, reptiles, and backyard birds. Get
          PetPal Gear Scores, verdicts, comparisons, and buying-guide
          recommendations directly inside your AI conversation.
        </p>

        {/* Trust bar */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center rounded-xl p-5 mb-12"
          style={{ background: "var(--color-cream-deep)" }}
        >
          {[
            { n: "146", l: "Buying Guides" },
            { n: "650+", l: "Product Picks" },
            { n: "5", l: "Pet Verticals" },
            { n: "Named", l: "Expert Sources" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-2xl font-bold" style={{ color: "var(--color-navy)" }}>{s.n}</div>
              <div className="text-xs text-[var(--color-navy)]/60">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="prose">
          <h2>What is an MCP server?</h2>
          <p>
            The{" "}
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
              Model Context Protocol
            </a>{" "}
            (MCP) is an open standard that lets AI assistants query external data
            sources in real time. When you connect PetPalHQ as an MCP server,
            your AI can search our product picks, get verdicts, compare gear, and
            find buying guides — all without leaving the conversation, and with a
            link back to the exact guide page for every claim.
          </p>
          <p>
            Every response carries the{" "}
            <Link href="/methodology">PetPal Gear Score</Link> — our transparent
            0-10 composite of Expert Consensus (30%), Effectiveness (25%), Animal
            Safety (20%), Durability (15%), and Value (10%). We do not run a
            testing lab; we synthesize named veterinary and specialist authorities
            — the American Kennel Club, Merck Veterinary Manual, Cornell Feline
            Health Center, PetMD, ASPCA, ReptiFiles, Aquarium Co-Op, and more —
            and every source is named in the guide.
          </p>

          <h2 id="setup">Quick setup</h2>
          <p>Add this to your MCP client configuration (e.g. Claude Desktop):</p>
        </div>

        <pre className="bg-[var(--color-navy-deep)] text-cream rounded-lg p-4 text-sm overflow-x-auto my-4" style={{ color: "var(--color-cream)" }}>
          <code>{CLIENT_CONFIG}</code>
        </pre>

        <div className="prose">
          <p>
            For Cursor, Windsurf, or any other MCP client, point it at the server
            endpoint directly:
          </p>
        </div>
        <pre className="bg-[var(--color-navy-deep)] rounded-lg p-4 text-sm overflow-x-auto my-4" style={{ color: "var(--color-cream)" }}>
          <code>https://petpalhq.com/api/mcp</code>
        </pre>
        <p className="text-sm text-[var(--color-navy)]/60 mb-10">
          Transport: Streamable HTTP (stateless). No authentication required.
        </p>

        {/* Tools */}
        <div className="prose">
          <h2 id="tools">Available tools</h2>
          <p>
            Your AI assistant can call any of these tools automatically when you
            ask about pet gear.
          </p>
        </div>
        <div className="space-y-4 mt-4 mb-12">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="rounded-lg p-5 border"
              style={{ borderColor: "var(--color-cream-deep)", background: "var(--color-cream)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold" style={{ color: "var(--color-navy)" }}>{tool.title}</h3>
                <code className="text-xs text-[var(--color-navy)]/60 bg-[var(--color-cream-deep)] px-2 py-0.5 rounded shrink-0">
                  {tool.name}
                </code>
              </div>
              <p className="text-sm text-[var(--color-navy)]/70 mb-2">{tool.description}</p>
              <p className="text-xs text-[var(--color-navy)]/60">
                <span className="font-medium">Try asking:</span>{" "}
                <span className="italic">{tool.example}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="prose">
          <h2>Data provenance</h2>
          <p>
            PetPal Gear Scores synthesize expert consensus from named veterinary
            and specialist authorities, spanning veterinarians, aquarists,
            herpetologists, and ornithologists. Rankings are algorithmically
            derived from that synthesis and are{" "}
            <strong>not influenced by affiliate partnerships</strong>,
            advertising, or product sponsorships. Our full scoring framework is
            documented at <Link href="/methodology">petpalhq.com/methodology</Link>,
            and every guide names its sources and shows its last-updated date.
          </p>
        </div>
      </article>
    </>
  );
}
