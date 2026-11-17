// SAMPLE reviews, written for the founder demo to show how the reviews section will look.
// They are always labelled "Sample" on the page and only render in demo mode (no live payment
// gateway), so they disappear automatically when the shop goes live. Replace with real customer
// reviews before launch. Never add these to SEO/structured data.

export type SampleReview = { name: string; city: string; rating: number; title: string; body: string };

const BY_CONCERN: Record<string, SampleReview[]> = {
  sun: [
    { name: "Adaeze O.", city: "Lagos", rating: 5, title: "No white cast on my skin", body: "I've tried sunscreens that leave me looking grey. This one blends in after a minute and sits well under makeup." },
    { name: "Tolu A.", city: "Ibadan", rating: 5, title: "Finally wearing SPF daily", body: "Light enough that I don't skip it. I reapply in the afternoon and it doesn't pill." },
    { name: "Ngozi E.", city: "Abuja", rating: 4, title: "Good daily protection", body: "Comfortable on oily skin. Would love a bigger size." },
  ],
  "dark-spots": [
    { name: "Chioma N.", city: "Port Harcourt", rating: 5, title: "My skin looks more even", body: "Been using it morning and night with SPF. My skin tone looks more even and the routine is easy to keep." },
    { name: "Funmi B.", city: "Lagos", rating: 5, title: "Gentle and easy to use", body: "Absorbs quickly and doesn't sting. Pairing it with the sunscreen like they advised." },
    { name: "Amaka I.", city: "Enugu", rating: 4, title: "Consistency is key", body: "Took a few weeks before I noticed a difference, but it's now a staple in my routine." },
  ],
  acne: [
    { name: "Kemi S.", city: "Lagos", rating: 5, title: "Calmer skin", body: "I started every other night like the instructions said. My skin feels calmer and I'm getting fewer new spots." },
    { name: "Ifeanyi U.", city: "Owerri", rating: 4, title: "Good, start slowly", body: "Some dryness in the first week, then my skin adjusted. The WhatsApp team helped me with my routine." },
  ],
  cleanse: [
    { name: "Bisola F.", city: "Abeokuta", rating: 5, title: "Clean without the tight feeling", body: "Lathers nicely and my face doesn't feel stripped afterwards. A little goes a long way." },
    { name: "Zainab M.", city: "Kaduna", rating: 5, title: "My daily wash now", body: "Gentle enough for morning and night. Smells fresh, not overpowering." },
  ],
  barrier: [
    { name: "Ebere C.", city: "Lagos", rating: 5, title: "Soft, hydrated skin", body: "My skin feels plump and comfortable all day, even with air conditioning at work." },
    { name: "Yetunde O.", city: "Ilorin", rating: 4, title: "Lovely texture", body: "Sinks in fast and works well under sunscreen." },
  ],
  body: [
    { name: "Halima D.", city: "Abuja", rating: 5, title: "Smooth, glowing skin", body: "My skin feels soft and nourished. I use it straight after my bath." },
    { name: "Ese A.", city: "Benin City", rating: 5, title: "Worth it", body: "Rich but not greasy. My knees and elbows look much better." },
  ],
};

export function sampleReviewsFor(concern: string): SampleReview[] {
  return BY_CONCERN[concern] ?? BY_CONCERN.barrier;
}

/** A spread of reviews across the range for the home page. */
export function homeSampleReviews(): (SampleReview & { concern: string })[] {
  return (["dark-spots", "sun", "acne"] as const).map((c) => ({ ...BY_CONCERN[c][0], concern: c }));
}
