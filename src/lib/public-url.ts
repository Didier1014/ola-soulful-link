// Canonical public base URL for links shared with buyers (checkout,
// payment links, emails). The app can be browsed from the Lovable URL
// or the custom domain, but links sent to leads must always point to
// the branded domain.
export const PUBLIC_BASE_URL = "https://www.redoxpay.site";

export function publicCheckoutUrl(slug: string) {
  return `${PUBLIC_BASE_URL}/c/${slug}`;
}

export function publicPaymentLinkUrl(slug: string) {
  return `${PUBLIC_BASE_URL}/l/${slug}`;
}
