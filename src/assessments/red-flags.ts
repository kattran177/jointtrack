/**
 * Red-flag symptom prompts for lower-limb joint deterioration.
 *
 * These prompts are shown before every assessment session and are stored
 * as a checklist in the clinician export. They serve as a safety net for
 * users who may otherwise continue self-monitoring through a serious event.
 *
 * Clinical basis
 * --------------
 * The symptoms listed below represent situations where delayed medical
 * assessment could lead to harm: septic arthritis, DVT, fracture, acute
 * compartment syndrome, or significant structural joint failure. Each flag
 * includes a plain-English explanation appropriate for adults aged 60+.
 *
 * Regulatory note
 * ---------------
 * Displaying these prompts does NOT make JointTrack a triage or diagnostic
 * tool. They are equivalent to the safety information printed in a
 * physiotherapy exercise booklet.
 */

export interface RedFlag {
  id: string
  /** Short label used in the PDF checklist */
  label: string
  /** Full description shown in the app UI */
  description: string
  /** Recommended immediate action */
  action: string
  /** True = advise 999/112 or ED; false = advise urgent GP appointment */
  isEmergency: boolean
}

export const RED_FLAGS: RedFlag[] = [
  {
    id: 'sudden-severe-pain',
    label: 'Sudden severe pain',
    description:
      'New, severe pain significantly worse than your usual joint pain, particularly if it came on suddenly or after a fall.',
    action: 'Go to your nearest Emergency Department or call 999/112.',
    isEmergency: true,
  },
  {
    id: 'cannot-bear-weight',
    label: 'Unable to bear weight',
    description:
      'You cannot put weight through your leg at all, or the leg completely gives way when you try to stand.',
    action: 'Go to your nearest Emergency Department or call 999/112.',
    isEmergency: true,
  },
  {
    id: 'joint-locking',
    label: 'Joint locking or catching',
    description:
      'The joint suddenly locks and you cannot straighten or bend it, or it catches painfully mid-movement.',
    action: 'Contact your GP today or go to Urgent Care.',
    isEmergency: false,
  },
  {
    id: 'fever-with-pain',
    label: 'Fever alongside joint pain or swelling',
    description:
      'You have a temperature (above 38°C) combined with increased joint pain, warmth, or redness. This can be a sign of joint infection (septic arthritis), which is a medical emergency.',
    action: 'Go to your nearest Emergency Department or call 999/112.',
    isEmergency: true,
  },
  {
    id: 'rapid-swelling',
    label: 'Sudden rapid swelling',
    description:
      'The joint has swollen significantly within a few hours, particularly after a fall or impact.',
    action: 'Go to your nearest Emergency Department or call 999/112.',
    isEmergency: true,
  },
  {
    id: 'calf-pain-dvt',
    label: 'Calf pain, redness, or warmth (possible DVT)',
    description:
      'Pain, redness, warmth, or swelling in your calf — especially after recent surgery or a period of limited movement. This could indicate a deep vein thrombosis (blood clot).',
    action: 'Go to your nearest Emergency Department or call 999/112.',
    isEmergency: true,
  },
  {
    id: 'numbness-tingling',
    label: 'Numbness or tingling in leg or foot',
    description:
      'New numbness, tingling, or weakness spreading down your leg or into your foot.',
    action: 'Contact your GP today.',
    isEmergency: false,
  },
]

/**
 * Returns only the emergency-level red flags (those requiring 999/ED).
 */
export function getEmergencyFlags(): RedFlag[] {
  return RED_FLAGS.filter((f) => f.isEmergency)
}

/**
 * Returns only the urgent (non-emergency) flags (GP same day).
 */
export function getUrgentFlags(): RedFlag[] {
  return RED_FLAGS.filter((f) => !f.isEmergency)
}

/**
 * Find a red flag by ID. Returns undefined if not found.
 */
export function findFlag(id: string): RedFlag | undefined {
  return RED_FLAGS.find((f) => f.id === id)
}
