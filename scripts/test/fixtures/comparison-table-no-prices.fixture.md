---
title: "Fixture: comparison charts carry no prices"
category: "Dogs"
publishDate: "2026-09-30"
lastProductCheck: "2026-09-30"
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
  - rank: 3
    label: "Dropped pick"
    price: "$777.77"
comparison:
  headers: ["Product", "Role", "Lifespan"]
  rows:
    - pickRef: r1
      cells: ["Typed name r1", "Everyday pick", "3-5 years"]
    - pickRef: r2
      cells: ["Typed name r2", "Heavy-duty pick", "5+ years"]
{{DROPPED_ROW}}    - pickRef: none
      cells: ["Checklist step", "{{UNKEYED_CELL}}", "Not a pick"]
---

Fixture body.
