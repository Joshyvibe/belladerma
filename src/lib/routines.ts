// Suggested routines built from the Belladerma range. Shared by the home page ("Build your
// routine") and product pages ("Complete your routine"). Steps refer to product slugs; any
// product that is hidden or missing is skipped automatically.

export type Routine = {
  id: string;
  title: string;
  concern: string;
  blurb: string;
  steps: { slug: string; step: string; when: string }[];
};

export const ROUTINES: Routine[] = [
  {
    id: "fade-dark-spots", title: "Fade dark spots", concern: "dark-spots",
    blurb: "Even out tone and fade marks, then protect your progress from the sun.",
    steps: [
      { slug: "purifying-foaming-cleanser", step: "Cleanse", when: "AM & PM" },
      { slug: "tone-up-serum", step: "Treat", when: "AM & PM" },
      { slug: "dewy-moisturizer", step: "Moisturise", when: "AM & PM" },
      { slug: "skin-protect-spf-50", step: "Protect", when: "AM" },
    ],
  },
  {
    id: "clear-breakouts", title: "Clear breakouts", concern: "acne",
    blurb: "Calm active breakouts without stripping your skin, and stop marks from darkening.",
    steps: [
      { slug: "purifying-foaming-cleanser", step: "Cleanse", when: "AM & PM" },
      { slug: "acne-control", step: "Treat", when: "PM" },
      { slug: "dewy-moisturizer", step: "Moisturise", when: "AM & PM" },
      { slug: "skin-protect-spf-50", step: "Protect", when: "AM" },
    ],
  },
  {
    id: "body-glow", title: "Even-toned body glow", concern: "body",
    blurb: "Brighten, soften and nourish skin from neck to toe.",
    steps: [
      { slug: "botaniglow-soap", step: "Wash", when: "Daily" },
      { slug: "moisturizing-body-butter", step: "Moisturise", when: "After bathing" },
      { slug: "derma-repair-oil", step: "Nourish", when: "Dry areas & marks" },
    ],
  },
];

export const routinesWith = (slug: string) => ROUTINES.filter((r) => r.steps.some((s) => s.slug === slug));
