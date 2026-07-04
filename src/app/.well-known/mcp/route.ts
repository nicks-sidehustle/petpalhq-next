/**
 * MCP Discovery Endpoint
 *
 * Returns a JSON manifest that AI clients and crawlers use to discover this
 * site's MCP server capabilities, plus trust metadata to help AI platforms
 * assess data reliability.
 */

import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    name: 'PetPalHQ Product Intelligence',
    description:
      'Editorial pet-gear intelligence for dog, cat, freshwater aquarium, reptile, and backyard-bird owners. ' +
      'Every product pick carries a transparent PetPal Gear Score synthesized from named veterinary and specialist ' +
      'authorities (American Kennel Club, Merck Veterinary Manual, Cornell Feline Health Center, PetMD, ASPCA, ' +
      'ReptiFiles, Aquarium Co-Op, and more). 146 buying guides with 650+ ranked picks.',
    url: 'https://petpalhq.com/api/mcp',
    transport: 'streamable-http',
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
    publisher: {
      name: 'PetPalHQ.com',
      url: 'https://petpalhq.com',
      author: 'Nicholas Miles',
      methodology: 'https://petpalhq.com/methodology',
      editorial_policy:
        'PetPalHQ does not run a testing lab. Scores synthesize expert consensus, regulatory guidance, and owner signals; every source is named and every guide is dated. Rankings are not influenced by affiliate partnerships or advertising.',
    },
    data: {
      buying_guides: 146,
      product_picks: '650+',
      verticals: 'dogs, cats, aquarium, reptile, birds',
      scoring_model: 'PetPal Gear Score (0-10)',
      update_frequency: 'rolling',
    },
    tools: [
      'search_pet_products',
      'get_pet_product_verdict',
      'compare_pet_products',
      'get_pet_buying_guide',
    ],
  }, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
