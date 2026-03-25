import { FOUNDING_CONFIG, REMOTE_CONFIG } from "@/lib/billing-config";

let _foundingConfig = { ...FOUNDING_CONFIG };

export function updateFoundingConfig(overrides: Partial<typeof FOUNDING_CONFIG>) {
  _foundingConfig = { ..._foundingConfig, ...overrides };
}

export function isFoundingOfferAvailable(): boolean {
  if (!REMOTE_CONFIG.foundingOfferEnabled) return false;
  if (!_foundingConfig.enabled) return false;
  return _foundingConfig.currentCount < _foundingConfig.maxCustomers;
}

export function getFoundingOfferRemainingSlots(): number {
  if (!isFoundingOfferAvailable()) return 0;
  return Math.max(0, _foundingConfig.maxCustomers - _foundingConfig.currentCount);
}

export function getFoundingOfferMaxSlots(): number {
  return _foundingConfig.maxCustomers;
}

export function getFoundingOfferCurrentCount(): number {
  return _foundingConfig.currentCount;
}

export function getFoundingAnnualPrice(): number {
  return _foundingConfig.annualPriceCents;
}

export function getRegularAnnualPrice(): number {
  return _foundingConfig.regularAnnualPriceCents;
}

export function getRegularMonthlyPrice(): number {
  return _foundingConfig.regularMonthlyPriceCents;
}

export async function claimFoundingOffer(): Promise<{ success: boolean; error?: string }> {
  if (!isFoundingOfferAvailable()) {
    return { success: false, error: "Das Founding-Angebot ist nicht mehr verfügbar." };
  }

  _foundingConfig.currentCount += 1;
  return { success: true };
}

export function disableFoundingOffer() {
  _foundingConfig.enabled = false;
}
