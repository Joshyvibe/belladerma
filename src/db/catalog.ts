import type * as schema from "./schema";

// The Belladerma range, taken from the product labels and campaign photos the client shared.
// Sizes, ingredients and claims are as printed on pack. PRICES ARE PLACEHOLDERS until the
// client confirms them; sale prices follow the "20% off all Belladerma skincare" campaign.
// Photos live in /public/products (cropped from the client's photos).

type NewProduct = typeof schema.products.$inferInsert;

const sale = (price: number) => ({ price, salePrice: Math.round((price * 0.8) / 100) * 100 });

export const CATALOG: NewProduct[] = [
  {
    slug: "skin-protect-spf-50", name: "Skin Protect SPF 50+", concern: "sun", ...sale(12500),
    tagline: "Broad-spectrum mineral sunscreen. Daily UVA/UVB protection for every skin type.",
    description: "A broad-spectrum mineral sunscreen with SPF 50+ that shields skin from the UVA and UVB rays behind dark spots, uneven tone and early ageing. Melanin helps, but it doesn't do the whole job.\n\nKey benefits:\n• UVA/UVB protection\n• Reef-safe formula\n• For all skin types\n• Water-resistant (up to 80 minutes)",
    size: "100 ml", stock: 40, illustration: "tube", images: ["/products/skin-protect-spf-50.jpg"],
    howToUse: "Apply generously as the last step of your morning routine, about two finger-lengths for face and neck, 15 minutes before sun exposure. Reapply every 2 hours outdoors, and after swimming, sweating or towel-drying.",
    ingredients: "Mineral (physical) UV filters. Full ingredient list printed on pack.",
    featured: true, sort: 1,
  },
  {
    slug: "tone-up-serum", name: "Tone Up Advanced Brightening Serum", concern: "dark-spots", ...sale(15000),
    tagline: "Niacinamide, kojic acid and alpha arbutin for a brighter, more even tone.",
    description: "An advanced brightening serum that targets uneven tone and the appearance of dark spots, for skin that looks radiant and healthy. Glow with confidence.\n\n• Brightens uneven skin tone\n• Helps reduce the appearance of dark spots\n• Promotes radiant, healthy-looking skin\n• Suitable for all skin types",
    size: "50 ml", stock: 30, illustration: "pump", images: ["/products/tone-up-serum.jpg"],
    howToUse: "After cleansing, apply 1–2 pumps to face and neck morning and/or night. Follow with moisturiser, and always finish with Skin Protect SPF 50+ in the morning.",
    ingredients: "Key actives: Niacinamide, Kojic Acid, Alpha Arbutin. Full ingredient list printed on pack.",
    featured: true, sort: 2,
  },
  {
    slug: "melanin-reset-serum", name: "Melanin Reset Serum", concern: "dark-spots", ...sale(16000),
    tagline: "Advanced depigmentation and tone correction for stubborn dark spots.",
    description: "A targeted serum for hyperpigmentation, dark spots and uneven tone on melanin-rich skin. Use consistently and pair with daily SPF to see and keep results.",
    size: "30 ml", stock: 25, illustration: "dropper", images: ["/products/melanin-reset-serum.jpg"],
    howToUse: "After cleansing, apply 2–3 drops to areas of concern or the whole face, once daily (evening recommended). Use SPF 50+ every morning while using this serum.",
    ingredients: "Full ingredient list to be supplied by Bella Derma.",
    featured: true, sort: 3,
  },
  {
    slug: "acne-control", name: "Acne Control", concern: "acne", ...sale(9500),
    tagline: "Targeted treatment for acne-prone and oily skin.",
    description: "A targeted treatment for breakouts on acne-prone and oily skin, combining clindamycin, niacinamide and tretinoin. Give your skin time and consistency. Not sure where to start? Message us for a routine.",
    size: "TBC", stock: 30, illustration: "pump", images: ["/products/acne-control.jpg"],
    howToUse: "Use at night on clean, dry skin. Apply a thin layer (pea-sized amount) to affected areas, avoiding eyes, lips and corners of the nose. Start every other night and build up. Use SPF 50+ every morning. Do not use if pregnant or breastfeeding; stop and seek advice if irritation persists.",
    ingredients: "Clindamycin (1%), Niacinamide (4%), Tretinoin. Skin type: acne / oily.",
    sort: 4,
  },
  {
    slug: "purifying-foaming-cleanser", name: "Purifying Foaming Cleanser", concern: "cleanse", ...sale(8000),
    tagline: "Licorice, green tea and aloe vera. Cleans without stripping.",
    description: "This purifying foaming cleanser is enriched with antibacterial ingredients and calming witch hazel to help keep your skin healthy, clean and refreshed. Its gentle formula purifies without stripping the skin of its natural moisture. For all skin types.",
    size: "150 ml", stock: 40, illustration: "tube", images: ["/products/purifying-foaming-cleanser.jpg"],
    howToUse: "Massage a small amount onto damp skin morning and night, then rinse well with lukewarm water. Follow with your serum and moisturiser.",
    ingredients: "Licorice, Green Tea, Aloe Vera, Witch Hazel. Full ingredient list printed on pack.",
    sort: 5,
  },
  {
    slug: "dewy-moisturizer", name: "Dewy Moisturizer with Ceramides", concern: "barrier", ...sale(13000),
    tagline: "Ceramide moisturiser for soft, plump, dewy-looking skin.",
    description: "A ceramide-rich moisturiser that supports the skin barrier, locks in hydration and leaves a healthy, dewy finish.",
    size: "TBC", stock: 25, illustration: "jar", images: ["/products/dewy-moisturizer.jpg"],
    howToUse: "Smooth over face and neck after serums, morning and night. In the morning, follow with Skin Protect SPF 50+.",
    ingredients: "Key ingredient: Ceramides. Full ingredient list printed on pack.",
    sort: 6,
  },
  {
    slug: "pdrn-100-serum", name: "PDRN 100 Serum", concern: "barrier", ...sale(15000),
    tagline: "Hydration and glow for dull, tired-looking skin.",
    description: "Our newest addition. A lightweight serum designed to leave skin feeling hydrated and looking smooth, fresh and radiant.",
    size: "30 ml (TBC)", stock: 25, illustration: "dropper", images: [], badge: "NEW",
    howToUse: "After cleansing, apply 2–3 drops to face and neck morning and/or night. Follow with moisturiser, and sunscreen in the morning.",
    ingredients: "Full ingredient list to be supplied by Bella Derma.",
    sort: 7,
  },
  {
    slug: "derma-repair-oil", name: "Derma Repair Oil", concern: "body", ...sale(11000),
    tagline: "Rosehip, jojoba and collagen to nourish and restore.",
    description: "A nourishing repair oil with rosehip, jojoba and collagen for soft, supple, even-looking skin. Dermatologically tested and suitable for all skin types.",
    size: "200 ml", stock: 20, illustration: "pump", images: ["/products/derma-repair-oil.jpg"],
    howToUse: "Massage a few drops into clean, slightly damp skin, focusing on dry areas, marks or uneven patches. Use daily, morning or night.",
    ingredients: "Rosehip Oil, Jojoba Oil, Collagen. Full ingredient list printed on pack.",
    sort: 8,
  },
  {
    slug: "moisturizing-body-butter", name: "Moisturizing Body Butter", concern: "body", ...sale(12000),
    tagline: "Ceramides, centella asiatica and glycerin for deep body hydration.",
    description: "A rich body butter that melts in to deeply moisturise and help strengthen the skin barrier, leaving skin soft and smooth all day.",
    size: "300 ml", stock: 30, illustration: "jar", images: ["/products/moisturizing-body-butter.jpg"],
    howToUse: "Massage generously over the body after bathing, while skin is still slightly damp. Use daily.",
    ingredients: "Ceramides, Centella Asiatica, Glycerin. Full ingredient list printed on pack.",
    sort: 9,
  },
  {
    slug: "botaniglow-soap", name: "BotaniGlow Soap", concern: "body", ...sale(7000),
    tagline: "Herbal brightening black soap with turmeric, aloe vera and licorice root.",
    description: "A herbal brightening black soap infused with turmeric, aloe vera and licorice root, for radiant, even-toned, glowing skin. Naturally you.",
    size: "TBC", stock: 40, illustration: "jar", images: ["/products/botaniglow-soap.jpg"],
    howToUse: "Lather a small amount with water, massage onto face or body for 30–60 seconds, then rinse well. Follow with moisturiser.",
    ingredients: "Turmeric, Aloe Vera, Licorice Root (in a black soap base). Full ingredient list printed on pack.",
    sort: 10,
  },
  {
    slug: "tranexamic-acid-bar-soap", name: "Tranexamic Acid Bar Soap", concern: "dark-spots", ...sale(6000),
    tagline: "Tranexamic acid, collagen and turmeric for a more even tone.",
    description: "A brightening bar soap with tranexamic acid, collagen and turmeric, enriched with hyaluronic acid, vitamin E, shea butter and castile olive oil to cleanse without drying.",
    size: "TBC", stock: 40, illustration: "jar", images: ["/products/tranexamic-acid-bar-soap.jpg"],
    howToUse: "Lather with water and massage onto damp skin for 30–60 seconds, then rinse. Use once or twice daily and follow with moisturiser and SPF.",
    ingredients: "Tranexamic Acid, Collagen, Turmeric, Hyaluronic Acid, Vitamin E, Shea Butter, Castile Olive Oil.",
    sort: 11,
  },
];

/** Old slugs that were renamed, so a sync updates the existing row instead of adding a duplicate. */
export const RENAMED_SLUGS: Record<string, string> = { "sunscreen-spf-50": "skin-protect-spf-50" };
