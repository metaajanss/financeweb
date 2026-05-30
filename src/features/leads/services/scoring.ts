/**
 * Lead Scoring Engine
 *
 * Calculates a 0–100 score for each lead based on:
 *   1. Profile completeness  (max 20 pts)
 *   2. Source quality        (max 15 pts)
 *   3. Lead status           (max 30 pts)
 *   4. Conversation activity (max 20 pts)
 *   5. Recency               (max 15 pts)
 */

export interface LeadScoringInput {
  // Profile
  email: string | null;
  phone: string | null;
  company: string | null;

  // Origin
  source: string | null;

  // Funnel stage
  status: string | null;

  // Engagement
  conversationCount: number;
  leadReplyCount: number;   // messages where sender_type = 'lead'
  enrollmentCount: number;

  // Timestamps
  createdAt: string | null;
}

export interface ScoreBreakdown {
  total: number;
  profile: number;
  source: number;
  status: number;
  engagement: number;
  recency: number;
}

// ─── 1. Profile completeness ────────────────────────────────────────────────

function scoreProfile(input: LeadScoringInput): number {
  let pts = 0;
  if (input.email?.trim())   pts += 5;
  if (input.phone?.trim())   pts += 8;
  if (input.company?.trim()) pts += 7;
  return pts; // max 20
}

// ─── 2. Source quality ───────────────────────────────────────────────────────

const SOURCE_SCORES: Record<string, number> = {
  whatsapp:      15,
  meta_lead_ads: 15,
  meta:          15,
  gmail:         12,
  email:         12,
  widget:        10,
  web:           10,
  excel_import:   6,
  manual:         5,
};

function scoreSource(source: string | null): number {
  if (!source) return 5;
  const key = source.toLowerCase();
  for (const [pattern, pts] of Object.entries(SOURCE_SCORES)) {
    if (key.includes(pattern)) return pts;
  }
  return 5; // unknown source → minimal credit
}

// ─── 3. Lead status ──────────────────────────────────────────────────────────

const STATUS_SCORES: Record<string, number> = {
  booked:       30,
  qualified:    22,
  contacted:    12,
  new:           5,
  unqualified:   0,
};

function scoreStatus(status: string | null): number {
  if (!status) return 5;
  return STATUS_SCORES[status.toLowerCase()] ?? 5;
}

// ─── 4. Conversation engagement ──────────────────────────────────────────────

function scoreEngagement(input: LeadScoringInput): number {
  let pts = 0;

  // Has any conversation at all
  if (input.conversationCount > 0)  pts += 5;
  if (input.conversationCount >= 2) pts += 3; // multi-channel or returning

  // Lead actually replied (strong signal)
  if (input.leadReplyCount > 0)  pts += 7;
  if (input.leadReplyCount >= 3) pts += 3; // very engaged
  if (input.leadReplyCount >= 6) pts += 2; // highly engaged — bonus

  // Enrolled in a sequence
  if (input.enrollmentCount > 0) pts += 0; // neutral, just automation running

  return Math.min(pts, 20); // cap at 20
}

// ─── 5. Recency ──────────────────────────────────────────────────────────────

function scoreRecency(createdAt: string | null): number {
  if (!createdAt) return 0;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 1)  return 15;
  if (ageDays <= 3)  return 12;
  if (ageDays <= 7)  return 9;
  if (ageDays <= 14) return 6;
  if (ageDays <= 30) return 3;
  return 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function calculateLeadScore(input: LeadScoringInput): ScoreBreakdown {
  const profile    = scoreProfile(input);
  const source     = scoreSource(input.source);
  const status     = scoreStatus(input.status);
  const engagement = scoreEngagement(input);
  const recency    = scoreRecency(input.createdAt);

  const total = Math.min(100, Math.max(0, profile + source + status + engagement + recency));

  return { total, profile, source, status, engagement, recency };
}
