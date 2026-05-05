# Guide Brief: Best Christmas Lights 2026

Target file: `src/content/guides/best-christmas-lights-2026.md`

## Purpose

Turn the current stub into the model flagship guide for the `lights-power` pillar. This guide should demonstrate the new quality standard: answer-first structure, practical buying decisions, transparent recommendation posture, safety guidance, affiliate clarity, and strong internal linking.

## Search / AEO intent

Primary intent: commercial investigation.

User questions:

- What are the best Christmas lights for my tree, house, yard, or smart display?
- Should I buy warm white, multicolor, smart, projector, or permanent lights?
- How many lights do I need?
- What safety details matter before buying?
- Which lights are worth storing and reusing next year?

## Editorial posture

Use researched/curated language. Do not claim hands-on lab testing. Existing product data has local `lastVerified` fields, but live Amazon availability still needs external verification before claiming current stock.

## Required content blocks

- Direct recommendation summary near top.
- Comparison table.
- Best-for recommendations.
- Safety checklist using official guidance from CPSC, ESFI, and NIST.
- Setup and storage advice.
- FAQ section in extractor-compatible format.
- Internal links to related lighting/outdoor/storage guides.

## Products / affiliate links

Use existing product data where available:

- `100-led-christmas-lights-33ft`
- `50ft-outdoor-multicolor-string-lights`

Use broad Amazon search links for categories where a single verified product entry does not yet exist. Avoid precise product-specific claims for those search links.

## Safety source notes

Official sources consulted for safety framing:

- CPSC seasonal lighting guidance: recognized testing lab, fuses/overcurrent protection, damaged cords/sockets, outdoor-rated use.
- ESFI holiday decorating safety: GFCI protection outdoors, avoid overloads, turn lights off before leaving/sleeping.
- NIST holiday fire safety: keep trees watered, keep trees away from heat, use recognized testing-lab lights, turn lights off before leaving/sleeping.

## Internal links to include

- `/guides/best-christmas-projector-lights-2026`
- `/guides/best-permanent-outdoor-christmas-lights-2026`
- `/guides/best-christmas-lighting-systems-installation-guide-2026`
- `/guides/best-christmas-storage-organization-solutions-2026`

## Acceptance criteria

- Stub language removed.
- `updatedDate` reflects current refresh.
- `validate:content` no longer flags this guide as under-development.
- Guide includes practical comparison, safety, setup, storage, and FAQ sections.
- Build/lint/typecheck pass.
