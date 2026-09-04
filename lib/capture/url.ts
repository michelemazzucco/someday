const TRACKING_PARAMS = [
  /^utm_/i,
  /^gclid$/i,
  /^gbraid$/i,
  /^wbraid$/i,
  /^fbclid$/i,
  /^msclkid$/i,
  /^mc_(cid|eid)$/i,
  /^_gl$/i,
  /^srsltid$/i,
  /^gad_source$/i,
  /^ref$/i,
  /^referrer$/i,
  /^cmp$/i,
  /^campaign$/i,
];

export function normaliseUrl(input: string): string {
  const url = new URL(input.trim());

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }

  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";
  url.username = "";
  url.password = "";
  if (url.port === "443" || url.port === "80") url.port = "";

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.some((pattern) => pattern.test(key))) url.searchParams.delete(key);
  }
  url.searchParams.sort();

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function retailerFromUrl(input: string): string {
  return new URL(input).hostname.toLowerCase().replace(/^www\./, "");
}

export function faviconForRetailer(retailer: string): string {
  return `https://${retailer}/favicon.ico`;
}
