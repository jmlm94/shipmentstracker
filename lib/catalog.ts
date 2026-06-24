// Snapshot of the active, physically-shippable Carbinox catalog pulled from
// Shopify. Powers the supplier form's product dropdown (with images +
// autocomplete). Refresh later via "Sync from Shopify" once live API creds are
// added. `id` is the Shopify handle (stable & unique); `sku` may be empty.
export type CatalogProduct = {
  id: string;
  title: string;
  sku: string;
  image: string;
};

const CDN = "https://cdn.shopify.com/s/files/1/0049/0533/6935";

export const CATALOG: CatalogProduct[] = [
  { id: "2x-tempered-glass-pack-for-carbinox-titan", title: "2x Tempered Glass Pack for Carbinox Titan Pro", sku: "", image: `${CDN}/files/1_527a6fb7-5674-45f8-ac12-106df883dc6e-234084.jpg` },
  { id: "2x-tempered-glass-pack-for-carbinox-vesta", title: "2x Tempered Glass Pack for Carbinox Vesta", sku: "", image: `${CDN}/files/2_c1895a62-1508-4c98-901c-0b1d26d4e3d4-370230.jpg` },
  { id: "2x-tempered-glass-pack-for-carbinox-vortex", title: "2x Tempered Glass Pack for Carbinox Vortex", sku: "temperedglass_vortex", image: `${CDN}/files/Disenosintitulo-233-100264.png` },
  { id: "2x-tempered-glass-pack-for-carbinox-x-ranger", title: "2x Tempered Glass Pack for Carbinox X-Ranger", sku: "", image: `${CDN}/files/1_60cfa2e8-4c37-42b1-80f7-5107b5870d43-408729.jpg` },
  { id: "band-9", title: "Black Force Band #13 [22mm]", sku: "22mm_band_001", image: `${CDN}/files/24-399275.png` },
  { id: "brown-fortress-band-5-22mm", title: "Black Fortress Band #5 [22mm]", sku: "CBX-BAND-FRTRS-BRN", image: `${CDN}/files/download_10b78e60-ac30-435a-ad4a-e8001b45ebaa.jpg` },
  { id: "black-gray-drift-band-25-22mm", title: "Black Gray Drift Band #25 [22mm]", sku: "CBX-BAND-DRIFT-BGY", image: `${CDN}/files/download_fa91b58c-db88-4214-8232-5ab89cef4b0a.jpg` },
  { id: "black-red-titan-band-20-22mm", title: "Black Gray Titan Band #20 [22mm]", sku: "CBX-BAND-TITAN-BRD", image: `${CDN}/files/download_c53ae3c0-a498-41c9-9f30-621eb0fddb22.jpg` },
  { id: "black-metal-band-pro-v2-toolkit-22mm", title: "Black Metal Band Pro V2 & ToolKit [22mm]", sku: "blackmetalbandv2", image: `${CDN}/files/Disenosintitulo-2025-05-13T170452.419-min.png` },
  { id: "black-light-gray-titan-band-19-22mm", title: "Black Red Titan Band #19 [22mm]", sku: "CBX-BAND-TITAN-BLG", image: `${CDN}/files/download_9e26d3be-48d3-47e5-995b-e71e9333f2ea.jpg` },
  { id: "wine-red-ridge-band-10-22mm", title: "Black Ridge Band #10 [22mm]", sku: "CBX-BAND-RIDGE-WRD", image: `${CDN}/files/download_7039dcba-8c86-485d-ac81-81ff9b238507.jpg` },
  { id: "black-vanguard-band-1-22mm", title: "Black White Vanguard Band #1 [22mm]", sku: "CBX-BAND-VNGRD-BLK", image: `${CDN}/files/download.jpg?v=1771282035` },
  { id: "band-19", title: "Black/Red Granite Band #16 [22mm]", sku: "22mm_band_016", image: `${CDN}/files/11_b1bd9ebf-bd63-4a10-86fd-54bef0f85795.png` },
  { id: "black-red-apex-band-16-22mm", title: "Blue Camo Apex Band #15 [22mm]", sku: "CBX-BAND-APEX-BRD", image: `${CDN}/files/download_b1caddf9-07eb-433f-b51e-540711a5fc57.jpg` },
  { id: "blue-red-flux-band-27-22mm", title: "Blue Red Flux Band #27 [22mm]", sku: "CBX-BAND-FLUX-BRD", image: `${CDN}/files/download_2e12ccf1-b8f3-4eaa-b6d5-46e234b0666f.jpg` },
  { id: "black-fortress-band-4-22mm", title: "Brown Fortress Band #4 [22mm]", sku: "CBX-BAND-FRTRS-BLK", image: `${CDN}/files/download_34ba9def-3e65-4c48-a0e0-e3441a706fbc.jpg` },
  { id: "carbinox-blaze-type-r", title: "Carbinox Blaze – Starter Pack (Type R)", sku: "", image: `${CDN}/files/1-min_3-300385.jpg` },
  { id: "carbinox-blaze-type-s", title: "Carbinox Blaze – Starter Pack (Type S)", sku: "", image: `${CDN}/files/2-min_3-332733.jpg` },
  { id: "carbinox-blaze", title: "Carbinox Blaze – Heavy Duty Smartwatch", sku: "", image: `${CDN}/files/image_94ab6401-3435-4da1-9f63-5f246d3c6a4e.webp` },
  { id: "carbinox-blaze-original-band-22mm", title: "Carbinox Blaze — Original Band [22mm]", sku: "", image: `${CDN}/files/1_7.png` },
  { id: "carbinox-edge-1", title: "Carbinox Edge – Starter Pack", sku: "", image: `${CDN}/files/2-min_12.png` },
  { id: "carbinox-edge", title: "Carbinox Edge – Ultra Rugged Smartwatch", sku: "", image: `${CDN}/files/5_2f16357c-4445-46a5-80f6-99e7bf0db68d.png` },
  { id: "carbinox-limited-edition-straps-6-pack-22mm", title: "Carbinox Limited Bands 6-Pack [22mm]", sku: "", image: `${CDN}/files/Diseno_sin_titulo_74_-min.png` },
  { id: "spkr", title: "Carbinox Speaker", sku: "crbnxspkr", image: `${CDN}/products/6.jpg` },
  { id: "carbinox-vortex-1", title: "Carbinox Vortex – Starter Pack", sku: "carbinox_vortex", image: `${CDN}/files/Diseno_sin_titulo-min_2bbef366-340d-4669-bf2e-e8810a4f7a4a.png` },
  { id: "carbinox-vortex-original-band-22mm", title: "Carbinox Vortex — Original Band [22mm]", sku: "", image: `${CDN}/files/2_8.png` },
  { id: "carbinox-wallet-pro", title: "Carbinox Wallet Pro", sku: "wallet_pro", image: `${CDN}/files/1-170967.jpg` },
  { id: "carbinox-x-ranger-1", title: "Carbinox X-Ranger – Starter Pack", sku: "carbinox_xranger_black", image: `${CDN}/files/Diseno_sin_titulo_-_2025-03-11T164749.582-min.png` },
  { id: "black-gray-stealth-band-28-22mm", title: "Carbon Fiber Stealth Band #28 [22mm]", sku: "CBX-BAND-STLTH-BGY", image: `${CDN}/files/download_7809f750-06c1-4fab-81c6-9e12ecdeae88.jpg` },
  { id: "classic-flex-band-29-22mm", title: "Classic Green Flex Band #29 [22mm]", sku: "CBX-BAND-FLEX-CLS", image: `${CDN}/files/download_a75afb35-1691-4ea9-b737-9b28b0c226b1.jpg` },
  { id: "dark-green-black-phantom-band-22-22mm", title: "Dark Green Black Phantom Band #22 [22mm]", sku: "CBX-BAND-PHNTM-DGB", image: `${CDN}/files/download_73142dd1-0b56-49f9-8a00-0051e1773ab9.jpg` },
  { id: "dark-gray-ridge-band-7-22mm", title: "Dark Red Ridge Band #7 [22mm]", sku: "CBX-BAND-RIDGE-DGR", image: `${CDN}/files/download_6e5c3626-c392-4131-b98f-da2f370f886d.jpg` },
  { id: "black-blue-apex-band-17-22mm", title: "Green Camo Apex Band #17 [22mm]", sku: "CBX-BAND-APEX-BBL", image: `${CDN}/files/download_5ff2cbbd-7c12-4fe5-8de1-de6bc78f70bf.jpg` },
  { id: "black-green-apex-band-18-22mm", title: "Grey Camo Apex Band #18 [22mm]", sku: "CBX-BAND-APEX-BGN", image: `${CDN}/files/download_096bee5a-2ad5-4747-bc75-4b77f83d90d2.jpg` },
  { id: "black-white-stripes-vanguard-band-3-22mm", title: "Limited Edition Vanguard Band #3 [22mm]", sku: "CBX-BAND-VNGRD-BWS", image: `${CDN}/files/download_4fd39bde-2dd3-417d-9039-7190441b568b.jpg` },
  { id: "band-24", title: "Magnetic Black/Yellow Band #8 [22mm]", sku: "22mm_band_008", image: `${CDN}/files/17-485430.png` },
  { id: "midnight-eclipse-band-23-22mm", title: "Midnight Eclipse Band #23 [22mm]", sku: "CBX-BAND-ECLPS-MID", image: `${CDN}/files/download_a5eb8976-ac63-4adb-b28b-063419a96e94.jpg` },
  { id: "navy-blue-ridge-band-30-22mm", title: "Navy Blue Ridge Band #30 [22mm]", sku: "CBX-BAND-RIDGE-NVY", image: `${CDN}/files/Disenosintitulo_62_1.png` },
  { id: "navy-blue-ridge-band-9-22mm", title: "Orange Ridge Band #9 [22mm]", sku: "CBX-BAND-RIDGE-ORG9", image: `${CDN}/files/download_aa7adc48-199c-4ffb-9a7a-09bf00e58c46.jpg` },
  { id: "orange-tideforce-band-14-22mm", title: "Orange Tideforce Band #14 [22mm]", sku: "CBX-BAND-TIDE-ORG", image: `${CDN}/files/4_1.png` },
  { id: "pocket-pro-for-carbinox-edge", title: "Pocket Pro — Portable Power Bank for Carbinox Edge", sku: "", image: `${CDN}/files/1_3a9a004e-587b-45a7-ae45-a35fa7c93efd.png` },
  { id: "qi-charger-for-carbinox-x-ranger", title: "QI Charger for Carbinox X-Ranger", sku: "charger_xranger", image: `${CDN}/products/1_0a337052-b4b5-4ab9-b29a-826306e2f8fb.jpg` },
  { id: "red-black-surge-band-24-22mm", title: "Red Black Surge Band #24 [22mm]", sku: "CBX-BAND-SURGE-RBK", image: `${CDN}/files/Diseno_sin_titulo_70_1.png` },
  { id: "orange-stitch-ridge-band-6-22mm", title: "Red Camo Apex Band #6 [22mm]", sku: "CBX-BAND-RIDGE-ORS", image: `${CDN}/files/Diseno_sin_titulo_63_1.png` },
  { id: "band-11", title: "Sky Blue Fortress Band #2 [22mm]", sku: "22mm_band_002", image: `${CDN}/files/Disenosintitulo-230-min-167774.png` },
  { id: "starlight-black-nova-band-26-22mm", title: "Starlight White Nova Band #26 [22mm]", sku: "CBX-BAND-NOVA-SBK", image: `${CDN}/files/download_f52ed379-1c19-42ce-bc2b-1600bb4ee983.jpg` },
  { id: "tempered-glass-for-carbinox-blaze-type-r-pack-of-2", title: "Tempered Glass for Carbinox Blaze Type R (Pack of 2)", sku: "tempered_blaze_r", image: `${CDN}/files/2-min_8_b84b126c-e3eb-40d1-b073-89076e9ddfc3-181454.png` },
  { id: "tempered-glass-for-carbinox-blaze-type-s-pack-of-2", title: "Tempered Glass for Carbinox Blaze Type S (Pack of 2)", sku: "tempered_blaze_s", image: `${CDN}/files/1-min_10-419415.png` },
  { id: "tempered-glass-for-carbinox-edge-pack-of-2", title: "Tempered Glass for Carbinox Edge (Pack of 2)", sku: "", image: `${CDN}/files/Disenosintitulo_37_-min.png` },
  { id: "the-blastbeam-by-carbinox", title: "The Blastbeam", sku: "", image: `${CDN}/files/4-min_2.png` },
  { id: "carbinox-powerblast-pro", title: "Truemobster x Carbinox – Powerblast Pro Blower", sku: "", image: `${CDN}/files/Diseno_sin_titulo_61_1.png` },
  { id: "usb-charger-for-carbinox-blaze-type-r", title: "USB Charger for Carbinox Blaze Type R", sku: "", image: `${CDN}/files/4-min_8.png` },
  { id: "usb-charger-for-carbinox-blaze-type-s", title: "USB Charger for Carbinox Blaze Type S", sku: "", image: `${CDN}/files/3-min_9.png` },
  { id: "usb-charger-for-carbinox-edge", title: "USB Charger for Carbinox Edge", sku: "", image: `${CDN}/files/Diseno_sin_titulo_48_-min.png` },
  { id: "usb-charging-cable-for-carbinox-ivy", title: "USB Charging Cable for Carbinox Ivy", sku: "", image: `${CDN}/files/Disenosintitulo-10-181034.png` },
  { id: "usb-charging-cable-for-carbinox-vortex", title: "USB Charging Cable for Carbinox Vortex", sku: "", image: `${CDN}/files/Disenosintitulo-211-min.png` },
  { id: "band-10", title: "White Terragrip Band #11 [22mm]", sku: "22mm_band_011", image: `${CDN}/files/2_d9f16b6c-4c93-4647-ab2a-009b99234028-580305.png` },
  { id: "band-14", title: "White/Gray Summit Band #12 [22mm]", sku: "22mm_band_012", image: `${CDN}/files/6_166d66f1-7d62-4482-82af-0b139eb7b51d.png` },
  { id: "yellow-black-volt-band-21-22mm", title: "Yellow Black Volt Band #21 [22mm]", sku: "CBX-BAND-VOLT-YBK", image: `${CDN}/files/download_e9ecf74a-2388-4d47-bda0-1a080e76cf92.jpg` },
];
