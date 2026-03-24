import type {
  FrequencyOption,
  ProjectSettings,
  ProjectTotals,
  Room,
  RoomCalculation,
} from "@/types";

export function getRoomCalculation(
  room: Room,
  settings: ProjectSettings,
  frequencyOptions: FrequencyOption[]
): RoomCalculation | null {
  const roomType = settings.roomTypes.find((rt) => rt.id === room.roomTypeId);
  if (!roomType) return null;

  const roomGroup = settings.roomGroups.find(
    (rg) => rg.id === (room.roomGroupId || roomType.groupId)
  );
  if (!roomGroup) return null;

  const frequencyOption = frequencyOptions.find(
    (f) => f.key === room.frequencyKey
  );
  if (!frequencyOption) return null;

  const effectivePerformanceValue =
    room.performanceValueOverride ?? roomType.performanceValue;

  if (effectivePerformanceValue <= 0 || room.area <= 0) return null;

  const timePerCleaningHours = room.area / effectivePerformanceValue;
  const monthlyHours = timePerCleaningHours * frequencyOption.monthlyFactor;
  const monthlyCost = monthlyHours * settings.hourlyRate;
  const annualCost = monthlyCost * 12;

  return {
    room,
    roomType,
    roomGroup,
    frequencyOption,
    effectivePerformanceValue,
    timePerCleaningHours,
    monthlyHours,
    monthlyCost,
    annualCost,
  };
}

export function getProjectTotals(
  calculations: (RoomCalculation | null)[],
  rooms: Room[]
): ProjectTotals {
  const valid = calculations.filter((c): c is RoomCalculation => c !== null);

  const totalArea = valid.reduce((sum, c) => sum + c.room.area, 0);
  const totalMonthlyHours = valid.reduce((sum, c) => sum + c.monthlyHours, 0);
  const totalMonthlyCost = valid.reduce((sum, c) => sum + c.monthlyCost, 0);
  const totalAnnualCost = totalMonthlyCost * 12;
  const pricePerSqm = totalArea > 0 ? totalMonthlyCost / totalArea : 0;

  return {
    totalArea,
    totalMonthlyHours,
    totalMonthlyCost,
    totalAnnualCost,
    pricePerSqm,
    roomCount: rooms.length,
  };
}

export function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatArea(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }) + " m²";
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
