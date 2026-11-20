import { z } from 'zod';

export const PersonaEnum = z.enum(['commuter', 'parent', 'senior', 'student']);

export const AnalyzeRequestSchema = z.object({
  city: z.string().trim().min(2, 'Please enter a valid city name.').max(80),
  persona: PersonaEnum,
  hasAirPurifier: z.boolean().default(false),
  plannedActivity: z.string().trim().max(200).optional().default(''),
});

export const PersonaSlotSchema = z.object({
  persona: PersonaEnum,
  hasAirPurifier: z.boolean().default(false),
  plannedActivity: z.string().trim().max(200).optional().default(''),
});

export const CompareRequestSchema = z.object({
  city: z.string().trim().min(2, 'Please enter a valid city name.').max(80),
  profileA: PersonaSlotSchema,
  profileB: PersonaSlotSchema,
});

const RoutineSlotSchema = z.object({
  action: z.string().trim().min(1, 'Action recommendation cannot be empty.'),
  why: z.string().trim().min(1, 'Recommendation must include a scientific justification.'),
});

export const AiGuidanceSchema = z.object({
  headline_summary: z.string().trim().min(1, 'Headline summary is required.'),
  risk_level: z.enum(['Low', 'Moderate', 'High', 'Severe']),
  routine_planner: z.object({
    morning: RoutineSlotSchema,
    afternoon: RoutineSlotSchema,
    evening: RoutineSlotSchema,
  }),
  indoor_air_hacks: z
    .array(
      z.object({
        hack: z.string().trim().min(1, 'Indoor hack title is required.'),
        why: z.string().trim().min(1, 'Indoor hack justification is required.'),
      })
    )
    .min(1)
    .max(5),
  sustainable_alternatives: z
    .array(
      z.object({
        swap: z.string().trim().min(1, 'Sustainable swap title is required.'),
        direct_impact: z.string().trim().min(1, 'Direct impact justification is required.'),
      })
    )
    .min(1)
    .max(5),
  data_attribution: z.string().default(''),
});

