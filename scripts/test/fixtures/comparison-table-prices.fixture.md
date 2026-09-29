---
title: "Fixture: comparison-table prices come from the cards"
category: "Dogs"
publishDate: "2026-09-29"
lastProductCheck: "2026-09-29"
picks:
  - rank: 1
    label: "Live pick"
    name: "Fixture Live Pick"
    brand: "Fixture"
    score: 8.5
    price: "$999.99"
    asin: "{{LIVE_ASIN}}"
  - rank: 2
    label: "Dark pick"
    name: "Fixture Dark Pick"
    brand: "Fixture"
    score: 8.0
    price: "$888.88"
    asin: "{{DARK_ASIN}}"
comparison:
  headers: ["Product", "Price", "Role"]
  rows:
    - pickRef: r1
      cells: ["Fixture Live Pick", "$999.99", "Typed price must be ignored"]
    - pickRef: r2
      cells: ["Fixture Dark Pick", "$888.88", "Dark: no figure"]
    - pickRef: none
      cells: ["Checklist step", "{{UNKEYED_PRICE_CELL}}", "Not a pick"]
---

Fixture body.
