/**
 * Waggle sponsored placement — MOCKUP CONFIG (branch: content/waggle-placement-mockup).
 *
 * NOT FOR MERGE. This branch exists so Waggle can preview what the negotiated
 * $800/quarter placement looks like on PetPalHQ before anything ships.
 *
 * Contract shape (owner commitment, "Pet Supplies Listing Opportunity" thread,
 * 2026-07-15):
 *  - ONE dedicated listing unit per site, featuring BOTH products together.
 *  - On PetPalHQ it lives on the monitoring/camera surface. PetPalHQ has no
 *    category-hub route (guide-based architecture), so the canonical camera
 *    surface is the site's broad camera/monitoring guide. The unit is gated to
 *    that ONE slug and renders null everywhere else.
 *  - Standalone and clearly marked "Sponsored". It is never blended into
 *    editorial rankings, scores, or pick lists — the guide's own roster,
 *    comparison table, and verdicts are untouched.
 *
 * Placement slug choice: `best-pet-cameras-2026` is the broad camera/monitoring
 * guide and — unlike `best-cellular-no-wifi-pet-cameras-2026` and
 * `best-rv-pet-temperature-monitors-2026` — it does NOT rank either Waggle
 * product. Putting the paid unit here keeps it purely additive and avoids
 * seating sponsor copy directly beside our own negative editorial verdicts on
 * the same two SKUs. Those verdicts stay exactly as written.
 *
 * Claim discipline: every sentence below is verifiable from the products' own
 * Amazon listings. No editorial endorsement language, no invented specs, no
 * scores. Both listings state "Subscription Required", so the unit says so too.
 *
 * ASINs verified live via the Amazon Creators API on 2026-08-13:
 *  - B07SGCYMGN — IN_STOCK, sold by Nimble Wireless Inc
 *  - B0F3DH57KD — IN_STOCK, sold by Nimble Wireless Inc
 *
 * Imagery: neutral placeholder frames only. No hotlinked or generated product
 * images — Waggle supplies its own creative before anything ships.
 */

export type WaggleProduct = {
  /** Sponsor-facing product name, as named in the owner's commitment. */
  name: string;
  /** Verified live 2026-08-13 (Amazon Creators API). */
  asin: string;
  /** Short sponsor-voice headline. */
  headline: string;
  /** 2-3 sentences, every claim traceable to the product's own listing. */
  body: string;
  /** Stated on the listing title itself. */
  note: string;
  /** ascsubtag suffix → st=sponsored_waggle_{subtagKey} */
  subtagKey: string;
};

/** The single guide slug this unit renders on. */
export const WAGGLE_PLACEMENT_SLUG = "best-pet-cameras-2026";

export const WAGGLE_PLACEMENT = {
  sponsor: "Waggle",
  eyebrow: "Sponsored",
  heading: "Waggle cellular pet monitors",
  intro:
    "Waggle makes pet monitors that run on 4G cellular rather than home Wi-Fi, for RVs, cars, campsites, and vacation rentals. Both products below are sold on Amazon.",
  products: [
    {
      name: "Waggle Pet Monitor Lite",
      asin: "B07SGCYMGN",
      headline: "Temperature alerts where there is no Wi-Fi",
      body:
        "The Pet Monitor Lite connects over 4G cellular, so there is no Wi-Fi network to join in an RV, a car, or a rental. It sends real-time temperature readings to the Waggle app and pushes alerts by app, SMS, and email — including when the power goes out — with no cap on the number of notifications.",
      note: "Waggle subscription required.",
      subtagKey: "lite",
    },
    {
      name: "Waggle 4G Mini Camera",
      asin: "B0F3DH57KD",
      headline: "A 2K camera that brings its own network",
      body:
        "The 4G Mini Camera has a SIM card built in and streams over LTE, so it does not need Wi-Fi either. It pans 300 degrees, records in 2K, and adds night vision and two-way talk, running on a 9000mAh battery for travel, camping, and outdoor use.",
      note: "Waggle subscription required.",
      subtagKey: "cam",
    },
  ] satisfies WaggleProduct[],
} as const;
