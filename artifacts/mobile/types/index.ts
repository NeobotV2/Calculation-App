export type FrequencyKey =
  | "5x_week"
  | "3x_week"
  | "2x_week"
  | "1x_week"
  | "biweekly"
  | "monthly";

export interface FrequencyOption {
  key: FrequencyKey;
  label: string;
  monthlyFactor: number;
}

export interface RoomGroup {
  id: string;
  label: string;
}

export interface RoomType {
  id: string;
  label: string;
  groupId: string;
  performanceValue: number;
}

export interface Room {
  id: string;
  name: string;
  roomTypeId: string;
  area: number;
  frequencyKey: FrequencyKey;
  performanceValueOverride?: number;
}

export interface ProjectSettings {
  projectName: string;
  companyName: string;
  hourlyRate: number;
  roomTypes: RoomType[];
  roomGroups: RoomGroup[];
}

export interface RoomCalculation {
  room: Room;
  roomType: RoomType;
  roomGroup: RoomGroup;
  frequencyOption: FrequencyOption;
  effectivePerformanceValue: number;
  timePerCleaningHours: number;
  monthlyHours: number;
  monthlyCost: number;
  annualCost: number;
}

export interface ProjectTotals {
  totalArea: number;
  totalMonthlyHours: number;
  totalMonthlyCost: number;
  totalAnnualCost: number;
  pricePerSqm: number;
  roomCount: number;
}
