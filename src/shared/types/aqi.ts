export type PersonaType = 'commuter' | 'parent' | 'senior' | 'student';

export interface UserProfile {
  city: string;
  latitude?: number;
  longitude?: number;
  persona: PersonaType;
  hasAirPurifier: boolean;
  plannedActivity: string;
}

export interface LiveAqiMetrics {
  city: string;
  stationName: string;
  aqi: number;
  category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';
  pm25: number;
  pm10: number;
  primaryPollutant: string;
  source: string;
  timestamp: string;
  isModelled?: boolean;
}

export interface RoutineSlot {
  action: string;
  why: string;
}

export interface AiGuidance {
  headline_summary: string;
  risk_level: 'Low' | 'Moderate' | 'High' | 'Severe';
  routine_planner: {
    morning: RoutineSlot;
    afternoon: RoutineSlot;
    evening: RoutineSlot;
  };
  indoor_air_hacks: Array<{ hack: string; why: string }>;
  sustainable_alternatives: Array<{ swap: string; direct_impact: string }>;
  data_attribution: string;
}

export interface AssistantResponse {
  metrics: LiveAqiMetrics;
  guidance: AiGuidance;
}

export interface PersonaSlotInput {
  persona: PersonaType;
  hasAirPurifier: boolean;
  plannedActivity: string;
}

export interface CompareResponse {
  metrics: LiveAqiMetrics;
  profileA: PersonaSlotInput;
  profileB: PersonaSlotInput;
  guidanceA: AiGuidance;
  guidanceB: AiGuidance;
}
