export type SeedListing = {
  url: string;
  variant?: string;
  priceEur: number;
  shippingEur?: number;
  inStock?: boolean;
  history?: number[];
};

export type SeedItem = {
  name: string;
  designer: string;
  brand: string;
  designYear: number;
  owned?: boolean;
  soon?: boolean;
  wantedFinish?: string;
  room?: string;
  dimensions?: string;
  notes?: string;
  tags: string[];
  commonsFile?: string;
  purchase?: { boughtAt: string; paidEur: number; boughtFrom: string; receiptNote?: string };
  listings: SeedListing[];
};

const eur = (value: number) => Math.round(value * 100);

export const SEED_ITEMS: SeedItem[] = [
  {
    name: "String Pocket",
    designer: "Nisse Strinning",
    brand: "String Furniture",
    designYear: 1949,
    soon: true,
    wantedFinish: "Walnut",
    room: "Hallway",
    dimensions: "60 × 15 × 50 cm",
    notes: "Walnut only. The white lacquer looks flat next to the oak floor.",
    tags: ["storage", "shelving", "hallway"],
    commonsFile: "Stringhylla.jpg",
    listings: [
      { url: "https://nordicnest.com/string-furniture/string-pocket-shelf/", variant: "Walnut", priceEur: eur(215), shippingEur: eur(9), inStock: true, history: [eur(249), eur(229), eur(215)] },
      { url: "https://www.connox.com/categories/furniture/shelves/string-pocket.html", variant: "Walnut", priceEur: eur(239), shippingEur: 0, inStock: true },
      { url: "https://royaldesign.com/string-pocket-shelf-white", variant: "White", priceEur: eur(199), shippingEur: eur(12), inStock: false },
    ],
  },
  {
    name: "Parentesi",
    designer: "Achille Castiglioni, Pio Manzù",
    brand: "Flos",
    designYear: 1971,
    wantedFinish: "Nickel",
    room: "Living room",
    dimensions: "400 cm cable drop",
    notes: "Needs 3 m of ceiling height to look right. Measure before buying.",
    tags: ["lighting", "living room", "floor"],
    commonsFile: "Flos Parentesi.jpg",
    listings: [
      { url: "https://www.flos.com/en/products/parentesi/", variant: "Nickel", priceEur: eur(690), shippingEur: 0, inStock: true },
      { url: "https://www.made-in-design.com/prod-parentesi-suspension-lamp-flos.html", variant: "Nickel", priceEur: eur(621), shippingEur: eur(15), inStock: true, history: [eur(690), eur(655), eur(621)] },
      { url: "https://www.pamono.com/parentesi-lamp-by-castiglioni-and-manzu-for-flos-1970s", variant: "Nickel", priceEur: eur(480), shippingEur: eur(60), inStock: true },
    ],
  },
  {
    name: "Panthella 250 Table",
    designer: "Verner Panton",
    brand: "Louis Poulsen",
    designYear: 1971,
    soon: true,
    wantedFinish: "Opal white acrylic",
    room: "Study",
    dimensions: "Ø 25 × 33 cm",
    notes: "The metallised versions are pretty but they throw a much harder light.",
    tags: ["lighting", "table lamp", "study"],
    listings: [
      { url: "https://www.louispoulsen.com/en-gb/catalog/private/table-lamp/panthella-250", variant: "Opal white", priceEur: eur(575), shippingEur: 0, inStock: true },
      { url: "https://www.finnishdesignshop.com/lighting-table-lamps-panthella-250-table-lamp-p-31548.html", variant: "Opal white", priceEur: eur(519), shippingEur: eur(19), inStock: true, history: [eur(575), eur(519)] },
      { url: "https://nordicnest.com/louis-poulsen/panthella-250-table-lamp/", variant: "Coral", priceEur: eur(549), shippingEur: eur(9), inStock: false },
    ],
  },
  {
    name: "PH 5 Pendant",
    designer: "Poul Henningsen",
    brand: "Louis Poulsen",
    designYear: 1958,
    wantedFinish: "Monochrome black",
    room: "Kitchen",
    dimensions: "Ø 50 × 26 cm",
    notes: "Glare-free at eye level over the table. Check the drop before ordering.",
    tags: ["lighting", "pendant", "kitchen"],
    listings: [
      { url: "https://www.louispoulsen.com/en-gb/catalog/private/pendant/ph-5", variant: "Monochrome black", priceEur: eur(829), shippingEur: 0, inStock: true },
      { url: "https://www.vinterior.co/listings/ph5-pendant-louis-poulsen-1970s", variant: "White", priceEur: eur(395), shippingEur: eur(45), inStock: true },
    ],
  },
  {
    name: "Eames Plastic Side Chair DSW",
    designer: "Charles & Ray Eames",
    brand: "Vitra",
    designYear: 1950,
    owned: true,
    room: "Dining room",
    dimensions: "49 × 55 × 83 cm",
    notes: "Four of them. Two more would finish the table.",
    tags: ["seating", "dining room"],
    commonsFile: "Charles and Ray Eames - Plastic Chair 1950-53.jpg",
    purchase: { boughtAt: "2025-11-14", paidEur: eur(1180), boughtFrom: "Vitra Store Milano", receiptNote: "Four chairs, maple base, 10% opening discount." },
    listings: [
      { url: "https://www.vitra.com/en-gb/product/eames-plastic-side-chair-dsw", variant: "Deep black / maple", priceEur: eur(395), shippingEur: 0, inStock: true },
      { url: "https://www.connox.com/categories/furniture/chairs/vitra-eames-plastic-side-chair-dsw.html", variant: "Deep black / maple", priceEur: eur(365), shippingEur: 0, inStock: true, history: [eur(395), eur(365)] },
    ],
  },
  {
    name: "Bit Stool",
    designer: "Simon Legald",
    brand: "Montana",
    designYear: 2018,
    wantedFinish: "Oat",
    room: "Kitchen",
    dimensions: "Ø 35 × 46 cm",
    notes: "Recycled plastic. The low one, not the bar height.",
    tags: ["seating", "stool", "kitchen"],
    listings: [
      { url: "https://www.montanafurniture.com/products/bit-stool-low/", variant: "Oat", priceEur: eur(179), shippingEur: eur(14), inStock: true },
      { url: "https://nordicnest.com/montana/bit-stool-low/", variant: "Oat", priceEur: eur(165), shippingEur: eur(9), inStock: true },
    ],
  },
  {
    name: "AJ Floor Lamp",
    designer: "Arne Jacobsen",
    brand: "Louis Poulsen",
    designYear: 1957,
    wantedFinish: "Dusty blue",
    room: "Living room",
    dimensions: "H 130 cm",
    tags: ["lighting", "floor lamp", "living room"],
    commonsFile: "Lamp arne-jacobsen.jpg",
    listings: [
      { url: "https://www.louispoulsen.com/en-gb/catalog/private/floor-lamp/aj-floor", variant: "Dusty blue", priceEur: eur(999), shippingEur: 0, inStock: true },
      { url: "https://www.finnishdesignshop.com/lighting-floor-lamps-aj-floor-lamp-p-1256.html", variant: "Black", priceEur: eur(915), shippingEur: eur(25), inStock: true, history: [eur(999), eur(960), eur(915)] },
    ],
  },
  {
    name: "Componibili 2",
    designer: "Anna Castelli Ferrieri",
    brand: "Kartell",
    designYear: 1967,
    owned: true,
    room: "Bedroom",
    dimensions: "Ø 32 × 40 cm",
    tags: ["storage", "bedroom"],
    commonsFile: "Kartell Componibili (weiß).jpg",
    purchase: { boughtAt: "2026-02-21", paidEur: eur(118), boughtFrom: "Kartell Flagship Roma" },
    listings: [
      { url: "https://www.kartell.com/gb/componibili-2-elements", variant: "White", priceEur: eur(129), shippingEur: eur(10), inStock: true },
      { url: "https://www.connox.com/categories/furniture/chests-of-drawers/kartell-componibili.html", variant: "White", priceEur: eur(115), shippingEur: 0, inStock: true },
    ],
  },
  {
    name: "CH24 Wishbone Chair",
    designer: "Hans J. Wegner",
    brand: "Carl Hansen & Søn",
    designYear: 1949,
    soon: true,
    wantedFinish: "Soaped oak, natural paper cord",
    room: "Dining room",
    dimensions: "55 × 51 × 76 cm",
    notes: "Second-hand is fine here. The paper cord can be rewoven.",
    tags: ["seating", "dining room"],
    commonsFile: "Hans J Wegner Wishbone Chair.jpg",
    listings: [
      { url: "https://www.carlhansen.com/en/collection/chairs/dining-chairs/ch24", variant: "Soaped oak", priceEur: eur(845), shippingEur: 0, inStock: true },
      { url: "https://www.vinterior.co/listings/ch24-wishbone-chair-carl-hansen-1960s", variant: "Teak", priceEur: eur(520), shippingEur: eur(70), inStock: true },
      { url: "https://www.1stdibs.com/furniture/seating/dining-chairs/hans-wegner-ch24-wishbone-chairs-set-of-four/", variant: "Oak, set of four", priceEur: eur(2400), shippingEur: eur(180), inStock: true, history: [eur(2800), eur(2400)] },
    ],
  },
  {
    name: "Flowerpot VP3",
    designer: "Verner Panton",
    brand: "&Tradition",
    designYear: 1968,
    room: "Bedroom",
    dimensions: "Ø 23 × 36 cm",
    notes: "Passed. Too close to the Panthella and it wins on light quality.",
    tags: ["lighting", "table lamp", "bedroom"],
    commonsFile: "Flowerpot VP3.jpg",
    listings: [
      { url: "https://www.andtradition.com/products/flowerpot-vp3", variant: "Matt white", priceEur: eur(319), shippingEur: 0, inStock: true },
      { url: "https://nordicnest.com/and-tradition/flowerpot-vp3-table-lamp/", variant: "Mustard", priceEur: eur(289), shippingEur: eur(9), inStock: true },
    ],
  },
];
