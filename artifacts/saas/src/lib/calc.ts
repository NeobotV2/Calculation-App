import { Room, FrequencyKey, Project } from "@/store/use-store";

export const FREQUENCY_FACTORS: Record<FrequencyKey, number> = {
  monthly: 1,
  biweekly: 2.17,
  "1x_week": 4.33,
  "2x_week": 8.67,
  "3x_week": 13,
  "4x_week": 17.33,
  "5x_week": 21.67,
  "6x_week": 26,
  "7x_week": 30.4,
};

export const FREQUENCY_LABELS: Record<FrequencyKey, string> = {
  monthly: "1x im Monat",
  biweekly: "Alle 14 Tage",
  "1x_week": "1x wöchentlich",
  "2x_week": "2x wöchentlich",
  "3x_week": "3x wöchentlich",
  "4x_week": "4x wöchentlich",
  "5x_week": "5x wöchentlich",
  "6x_week": "6x wöchentlich",
  "7x_week": "7x wöchentlich (täglich)",
};

export function calcRoom(room: Room, hourlyRate: number) {
  const perf = room.customPerformance || room.typePerformance;
  const timePerCleaning = perf > 0 ? room.area / perf : 0;
  const factor = FREQUENCY_FACTORS[room.frequency];
  const monthlyHours = timePerCleaning * factor;
  const monthlyCost = monthlyHours * hourlyRate;

  return {
    timePerCleaning,
    monthlyHours,
    monthlyCost,
    annualCost: monthlyCost * 12,
  };
}

export function calcProjectTotals(project: Project | undefined, hourlyRate: number) {
  if (!project) {
    return { area: 0, hours: 0, cost: 0, annualCost: 0, count: 0, pricePerSqm: 0 };
  }
  let area = 0;
  let hours = 0;
  let cost = 0;

  project.rooms.forEach((r) => {
    area += r.area;
    const rc = calcRoom(r, hourlyRate);
    hours += rc.monthlyHours;
    cost += rc.monthlyCost;
  });

  return {
    area,
    hours,
    cost,
    annualCost: cost * 12,
    count: project.rooms.length,
    pricePerSqm: area > 0 ? cost / area : 0,
  };
}
