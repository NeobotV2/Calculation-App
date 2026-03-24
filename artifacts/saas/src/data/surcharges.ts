export type SurchargeCategory = "soilingLevel" | "furnishingLevel" | "floorType";

export interface SurchargeOption {
  id: string;
  label: string;
  modifier: number;
}

export interface SurchargeDefinition {
  category: SurchargeCategory;
  label: string;
  options: SurchargeOption[];
  defaultId: string;
}

export const SURCHARGE_DEFINITIONS: SurchargeDefinition[] = [
  {
    category: "soilingLevel",
    label: "Verschmutzungsgrad",
    options: [
      { id: "soiling_light", label: "Leicht", modifier: 0.2 },
      { id: "soiling_normal", label: "Normal", modifier: 0 },
      { id: "soiling_heavy", label: "Stark", modifier: -0.25 },
      { id: "soiling_very_heavy", label: "Sehr stark", modifier: -0.4 },
    ],
    defaultId: "soiling_normal",
  },
  {
    category: "furnishingLevel",
    label: "Möblierungsgrad",
    options: [
      { id: "furnishing_sparse", label: "Gering", modifier: 0.15 },
      { id: "furnishing_normal", label: "Normal", modifier: 0 },
      { id: "furnishing_dense", label: "Dicht", modifier: -0.2 },
      { id: "furnishing_very_dense", label: "Sehr dicht", modifier: -0.35 },
    ],
    defaultId: "furnishing_normal",
  },
  {
    category: "floorType",
    label: "Bodenbelag",
    options: [
      { id: "floor_hard", label: "Hartboden (PVC, Fliesen)", modifier: 0 },
      { id: "floor_carpet", label: "Teppichboden", modifier: -0.15 },
      { id: "floor_stone", label: "Naturstein", modifier: -0.1 },
      { id: "floor_special", label: "Spezialbelag", modifier: -0.2 },
    ],
    defaultId: "floor_hard",
  },
] as SurchargeDefinition[];

export type RoomSurcharges = {
  soilingLevel?: string;
  furnishingLevel?: string;
  floorType?: string;
};

export function calcAdjustedPerformance(basePerf: number, surcharges?: RoomSurcharges): number {
  if (!surcharges) return basePerf;

  let totalModifier = 0;

  for (const def of SURCHARGE_DEFINITIONS) {
    const selectedId = surcharges[def.category as keyof RoomSurcharges];
    if (selectedId) {
      const option = def.options.find((o) => o.id === selectedId);
      if (option) {
        totalModifier += option.modifier;
      }
    }
  }

  const adjusted = basePerf * (1 + totalModifier);
  return Math.max(adjusted, 1);
}

export function getSurchargeLabel(category: SurchargeCategory, optionId: string): string {
  const def = SURCHARGE_DEFINITIONS.find((d) => d.category === category);
  if (!def) return "";
  const option = def.options.find((o) => o.id === optionId);
  return option ? option.label : "";
}

export function getTotalModifier(surcharges?: RoomSurcharges): number {
  if (!surcharges) return 0;
  let total = 0;
  for (const def of SURCHARGE_DEFINITIONS) {
    const selectedId = surcharges[def.category as keyof RoomSurcharges];
    if (selectedId) {
      const option = def.options.find((o) => o.id === selectedId);
      if (option) total += option.modifier;
    }
  }
  return total;
}
