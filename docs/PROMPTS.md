# ChristmasGearHQ Content Generation Prompts

## Variables

- `{SITE_NAME}` = ChristmasGearHQ
- `{AUDIENCE}` = Homeowners decorating for Christmas (30-55, families)
- `{TONE}` = Warm, festive, practical, family-focused
- `{BUDGET_RANGE}` = $15-40 budget, $40-150 mid, $150-500+ premium
- `{AVOID_TERMS}` = desk, office, garden, dorm, summer, patio, work from home

---

## Buying Guide Generation

```
You are writing for ChristmasGearHQ, a site that helps families find the best Christmas decorations and holiday gear.

Write a comprehensive buying guide for {CATEGORY}.

TARGET AUDIENCE:
- Homeowners decorating for Christmas
- Age 30-55, often with families
- Budget range: $15-40 (budget), $40-150 (mid), $150-500+ (premium)
- They care about: durability across seasons, easy setup, family-friendly, value

TONE: Warm, festive, practical - excited about holidays but not saccharine

STRUCTURE:
1. Brief intro (why this category matters for the holidays)
2. Quick Picks table (top 5, with price and "best for")
3. Detailed review of each pick (150-200 words each)
4. Size/space guide if relevant
5. FAQ (3-5 common questions)

REQUIREMENTS:
- Use real Amazon products with actual ASINs
- Include current prices
- Mention durability/multi-season value
- Consider storage when not in use
- Include safety notes where relevant

AVOID:
- desk, office, garden, dorm, summer, patio, work from home
- Generic home decor not Christmas-specific
- Overly religious content
- Assuming huge budgets
```

---

## Product Review Generation

```
Write a detailed review of [PRODUCT_NAME] (ASIN: [ASIN]) for ChristmasGearHQ.

AUDIENCE: Homeowners decorating for Christmas
TONE: Warm, festive, practical

STRUCTURE:
1. Overview (what it is, who should buy it)
2. Setup/Installation notes
3. Key Features
4. Pros (3-5, emphasize durability and ease of use)
5. Cons (2-3, be honest)
6. Storage considerations
7. Verdict (recommendation + who it's best for)

REQUIREMENTS:
- Emphasize multi-season value
- Note dimensions/sizes clearly
- Mention if it's good for small spaces
- Include safety notes if electrical

AVOID: desk, office, garden, dorm, summer, patio references
```

---

## Seasonal Timing Prompts

### Pre-Season (September-October)
```
Write "planning ahead" content for ChristmasGearHQ:
- "What to Buy Now Before Christmas Rush"
- "Christmas Decoration Checklist for [Year]"
- Focus on early bird deals, avoiding shipping delays
```

### Peak Season (October-December)
```
Write peak-season buying guides with urgency:
- Emphasize in-stock availability
- Note shipping times for Prime
- Include "still time to order" angles
- Gift-giving recommendations
```

### Post-Season (December 26 - January)
```
Write post-Christmas content:
- Storage and organization guides
- "Best Clearance Deals" roundups  
- "What to Replace Next Year" audits
- Ornament and decoration care tips
```

---

## Content Validation Prompt

```
Review this content for ChristmasGearHQ:

[PASTE CONTENT]

CHECK FOR:
1. Is it actually Christmas/holiday relevant?
2. Any off-topic references? (desk, office, garden, dorm, summer, patio)
3. Appropriate for families?
4. Practical and helpful, not just fluffy?
5. Are products real with working ASINs?
6. Safety considerations addressed where needed?

RESPOND WITH:
- PASS: Ready to publish
- NEEDS_EDIT: [specific issues]
- REJECT: [not appropriate for site]
```
