// The product catalog, matched to the Carbinox Sortly inventory export
// (24 June 2026). Names are the source of truth (Sortly has no SKU column in
// the export), so `sku` is blank. Images are reused from the Shopify CDN where
// the product name matches; a few Sortly-only items have no image.
//
// This is the bundled fallback. Uploading a fresh Sortly CSV at
// /dashboard/products overrides it from the database.
export type CatalogProduct = {
  id: string;
  title: string;
  sku: string;
  image: string;
};

const CDN = "https://cdn.shopify.com/s/files/1/0049/0533/6935";

export const CATALOG: CatalogProduct[] = [
  // ── Bands ──────────────────────────────────────────────────────────────
  { id: "black-force-band-13", title: "Black Force Band #13 [22mm]", sku: "", image: `${CDN}/files/24-399275.png` },
  { id: "black-fortress-band-5", title: "Black Fortress Band #5 [22mm]", sku: "", image: `${CDN}/files/download_10b78e60-ac30-435a-ad4a-e8001b45ebaa.jpg` },
  { id: "black-gray-drift-band-25", title: "Black Gray Drift Band #25 [22mm]", sku: "", image: `${CDN}/files/download_fa91b58c-db88-4214-8232-5ab89cef4b0a.jpg` },
  { id: "black-gray-titan-band-20", title: "Black Gray Titan Band #20 [22mm]", sku: "", image: `${CDN}/files/download_c53ae3c0-a498-41c9-9f30-621eb0fddb22.jpg` },
  { id: "black-metal-band-pro-v2-toolkit", title: "Black Metal Band Pro V2 & ToolKit [22mm]", sku: "", image: `${CDN}/files/Disenosintitulo-2025-05-13T170452.419-min.png` },
  { id: "black-red-titan-band-19", title: "Black Red Titan Band #19 [22mm]", sku: "", image: `${CDN}/files/download_9e26d3be-48d3-47e5-995b-e71e9333f2ea.jpg` },
  { id: "black-ridge-band-10", title: "Black Ridge Band #10 [22mm]", sku: "", image: `${CDN}/files/download_7039dcba-8c86-485d-ac81-81ff9b238507.jpg` },
  { id: "black-white-vanguard-band-1", title: "Black White Vanguard Band #1 [22mm]", sku: "", image: `${CDN}/files/download.jpg?v=1771282035` },
  { id: "black-red-granite-band-16", title: "Black/Red Granite Band #16 [22mm]", sku: "", image: `${CDN}/files/11_b1bd9ebf-bd63-4a10-86fd-54bef0f85795.png` },
  { id: "blue-camo-apex-band-15", title: "Blue Camo Apex Band #15 [22mm]", sku: "", image: `${CDN}/files/download_b1caddf9-07eb-433f-b51e-540711a5fc57.jpg` },
  { id: "blue-red-flux-band-27", title: "Blue Red Flux Band #27 [22mm]", sku: "", image: `${CDN}/files/download_2e12ccf1-b8f3-4eaa-b6d5-46e234b0666f.jpg` },
  { id: "brown-fortress-band-4", title: "Brown Fortress Band #4 [22mm]", sku: "", image: `${CDN}/files/download_34ba9def-3e65-4c48-a0e0-e3441a706fbc.jpg` },
  { id: "carbinox-limited-bands-6-pack", title: "Carbinox Limited Bands 6-Pack [22mm]", sku: "", image: `${CDN}/files/Diseno_sin_titulo_74_-min.png` },
  { id: "carbon-fiber-stealth-band-28", title: "Carbon Fiber Stealth Band #28 [22mm]", sku: "", image: `${CDN}/files/download_7809f750-06c1-4fab-81c6-9e12ecdeae88.jpg` },
  { id: "classic-green-flex-band-29", title: "Classic Green Flex Band #29 [22mm]", sku: "", image: `${CDN}/files/download_a75afb35-1691-4ea9-b737-9b28b0c226b1.jpg` },
  { id: "dark-green-black-phantom-band-22", title: "Dark Green Black Phantom Band #22 [22mm]", sku: "", image: `${CDN}/files/download_73142dd1-0b56-49f9-8a00-0051e1773ab9.jpg` },
  { id: "dark-red-ridge-band-7", title: "Dark Red Ridge Band #7 [22mm]", sku: "", image: `${CDN}/files/download_6e5c3626-c392-4131-b98f-da2f370f886d.jpg` },
  { id: "green-camo-apex-band-17", title: "Green Camo Apex Band #17 [22mm]", sku: "", image: `${CDN}/files/download_5ff2cbbd-7c12-4fe5-8de1-de6bc78f70bf.jpg` },
  { id: "grey-camo-apex-band-18", title: "Grey Camo Apex Band #18 [22mm]", sku: "", image: `${CDN}/files/download_096bee5a-2ad5-4747-bc75-4b77f83d90d2.jpg` },
  { id: "limited-edition-vanguard-band-3", title: "Limited Edition Vanguard Band #3 [22mm]", sku: "", image: `${CDN}/files/download_4fd39bde-2dd3-417d-9039-7190441b568b.jpg` },
  { id: "magnetic-black-yellow-band-8", title: "Magnetic Black/Yellow Band #8 [22mm]", sku: "", image: `${CDN}/files/17-485430.png` },
  { id: "midnight-eclipse-band-23", title: "Midnight Eclipse Band #23 [22mm]", sku: "", image: `${CDN}/files/download_a5eb8976-ac63-4adb-b28b-063419a96e94.jpg` },
  { id: "navy-blue-ridge-band-30", title: "Navy Blue Ridge Band #30 [22mm]", sku: "", image: `${CDN}/files/Disenosintitulo_62_1.png` },
  { id: "orange-ridge-band-9", title: "Orange Ridge Band #9 [22mm]", sku: "", image: `${CDN}/files/download_aa7adc48-199c-4ffb-9a7a-09bf00e58c46.jpg` },
  { id: "orange-tideforce-band-14", title: "Orange Tideforce Band #14 [22mm]", sku: "", image: `${CDN}/files/4_1.png` },
  { id: "red-black-surge-band-24", title: "Red Black Surge Band #24 [22mm]", sku: "", image: `${CDN}/files/Diseno_sin_titulo_70_1.png` },
  { id: "red-camo-apex-band-6", title: "Red Camo Apex Band #6 [22mm]", sku: "", image: `${CDN}/files/Diseno_sin_titulo_63_1.png` },
  { id: "sky-blue-fortress-band-2", title: "Sky Blue Fortress Band #2 [22mm]", sku: "", image: `${CDN}/files/Disenosintitulo-230-min-167774.png` },
  { id: "starlight-white-nova-band-26", title: "Starlight White Nova Band #26 [22mm]", sku: "", image: `${CDN}/files/download_f52ed379-1c19-42ce-bc2b-1600bb4ee983.jpg` },
  { id: "white-terragrip-band-11", title: "White Terragrip Band #11 [22mm]", sku: "", image: `${CDN}/files/2_d9f16b6c-4c93-4647-ab2a-009b99234028-580305.png` },
  { id: "white-gray-summit-band-12", title: "White/Gray Summit Band #12 [22mm]", sku: "", image: `${CDN}/files/6_166d66f1-7d62-4482-82af-0b139eb7b51d.png` },
  { id: "yellow-black-volt-band-21", title: "Yellow Black Volt Band #21 [22mm]", sku: "", image: `${CDN}/files/download_e9ecf74a-2388-4d47-bda0-1a080e76cf92.jpg` },
  // ── Charging Cables ────────────────────────────────────────────────────
  { id: "qi-charger-x-ranger", title: "QI Charger for Carbinox X-Ranger", sku: "", image: `${CDN}/products/1_0a337052-b4b5-4ab9-b29a-826306e2f8fb.jpg` },
  { id: "usb-charger-blaze-type-r", title: "USB Charger for Carbinox Blaze Type R", sku: "", image: `${CDN}/files/4-min_8.png` },
  { id: "usb-charger-blaze-type-s", title: "USB Charger for Carbinox Blaze Type S", sku: "", image: `${CDN}/files/3-min_9.png` },
  { id: "usb-charger-edge", title: "USB Charger for Carbinox Edge", sku: "", image: `${CDN}/files/Diseno_sin_titulo_48_-min.png` },
  { id: "usb-cable-ivy", title: "USB Charging Cable for Carbinox Ivy", sku: "", image: `${CDN}/files/Disenosintitulo-10-181034.png` },
  { id: "usb-cable-vortex", title: "USB Charging Cable for Carbinox Vortex", sku: "", image: `${CDN}/files/Disenosintitulo-211-min.png` },
  // ── Outdoor Gear ───────────────────────────────────────────────────────
  { id: "carbinox-lanyard-gift", title: "Carbinox Lanyard (Gift)", sku: "", image: "" },
  { id: "carbinox-speaker", title: "Carbinox Speaker", sku: "", image: `${CDN}/products/6.jpg` },
  { id: "carbinox-sunglasses", title: "Carbinox Sunglasses", sku: "", image: "" },
  { id: "carbinox-tactical-backpack", title: "Carbinox Tactical Backpack", sku: "", image: "" },
  { id: "carbinox-wallet-pro", title: "Carbinox Wallet Pro", sku: "", image: `${CDN}/files/1-170967.jpg` },
  { id: "pocket-pro-edge", title: "Pocket Pro for Carbinox Edge", sku: "", image: `${CDN}/files/1_3a9a004e-587b-45a7-ae45-a35fa7c93efd.png` },
  { id: "the-blastbeam", title: "The Blastbeam", sku: "", image: `${CDN}/files/4-min_2.png` },
  { id: "powerblast-pro-blower", title: "Truemobster x Carbinox – Powerblast Pro Blower", sku: "", image: `${CDN}/files/Diseno_sin_titulo_61_1.png` },
  // ── Smartwatches ───────────────────────────────────────────────────────
  { id: "carbinox-blaze-type-s-square", title: "Carbinox Blaze Type S (Square)", sku: "", image: `${CDN}/files/2-min_3-332733.jpg` },
  { id: "carbinox-blaze-starter-type-r", title: "Carbinox Blaze – Starter Pack (Type R)", sku: "", image: `${CDN}/files/1-min_3-300385.jpg` },
  { id: "carbinox-edge-black", title: "Carbinox Edge (Black)", sku: "", image: `${CDN}/files/2-min_12.png` },
  { id: "carbinox-edge-silver", title: "Carbinox Edge (Silver)", sku: "", image: "" },
  { id: "carbinox-vortex-starter", title: "Carbinox Vortex – Starter Pack", sku: "", image: `${CDN}/files/Diseno_sin_titulo-min_2bbef366-340d-4669-bf2e-e8810a4f7a4a.png` },
  { id: "carbinox-x-ranger-starter", title: "Carbinox X-Ranger – Starter Pack", sku: "", image: `${CDN}/files/Diseno_sin_titulo_-_2025-03-11T164749.582-min.png` },
  // ── Tempered Glasses ───────────────────────────────────────────────────
  { id: "tempered-glass-titan-pro", title: "2x Tempered Glass Pack for Carbinox Titan Pro", sku: "", image: `${CDN}/files/1_527a6fb7-5674-45f8-ac12-106df883dc6e-234084.jpg` },
  { id: "tempered-glass-vesta", title: "2x Tempered Glass Pack for Carbinox Vesta", sku: "", image: `${CDN}/files/2_c1895a62-1508-4c98-901c-0b1d26d4e3d4-370230.jpg` },
  { id: "tempered-glass-vortex", title: "2x Tempered Glass Pack for Carbinox Vortex", sku: "", image: `${CDN}/files/Disenosintitulo-233-100264.png` },
  { id: "tempered-glass-x-ranger", title: "2x Tempered Glass Pack for Carbinox X-Ranger", sku: "", image: `${CDN}/files/1_60cfa2e8-4c37-42b1-80f7-5107b5870d43-408729.jpg` },
  { id: "tempered-glass-blaze-r", title: "Tempered Glass for Carbinox Blaze Type R (Pack of 2)", sku: "", image: `${CDN}/files/2-min_8_b84b126c-e3eb-40d1-b073-89076e9ddfc3-181454.png` },
  { id: "tempered-glass-blaze-s", title: "Tempered Glass for Carbinox Blaze Type S (Pack of 2)", sku: "", image: `${CDN}/files/1-min_10-419415.png` },
  { id: "tempered-glass-edge", title: "Tempered Glass for Carbinox Edge (Pack of 2)", sku: "", image: `${CDN}/files/Disenosintitulo_37_-min.png` },
];
