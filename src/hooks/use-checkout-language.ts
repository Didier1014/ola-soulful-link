import { useEffect, useState } from "react";
import { checkoutCopy, resolveCheckoutLanguage } from "@/lib/checkout-language";
export function useCheckoutLanguage(config: unknown, country?: string | null) {
  const [browserLanguage, setBrowserLanguage] = useState<string>();
  useEffect(() => { setBrowserLanguage(navigator.language); }, []);
  const language = resolveCheckoutLanguage(config, country, browserLanguage);
  return { language, copy: checkoutCopy[language] };
}