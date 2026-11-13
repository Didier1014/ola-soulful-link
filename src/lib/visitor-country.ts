export function visitorCountry(request: Request): string | null {
  const cf = (request as Request & { cf?: { country?: string } }).cf;
  const country = cf?.country ?? request.headers.get("cf-ipcountry");
  return country && /^[A-Z]{2}$/.test(country) && !["XX", "T1"].includes(country) ? country : null;
}