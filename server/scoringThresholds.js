/** Org/job configurable intelligence & bucket thresholds. */

export const DEFAULT_INTELLIGENCE_THRESHOLDS = {
  bucket: { green: 80, amber: 60 },
  tiers: {
    exceptional: 90,
    strong: 80,
    potential: 70,
    needs_review: 60,
  },
  recommendations: {
    strongly_recommend: 90,
    recommend: 80,
    review: 65,
  },
};

export function parseThresholdsJson(raw) {
  if (!raw) return { ...DEFAULT_INTELLIGENCE_THRESHOLDS, bucket: { ...DEFAULT_INTELLIGENCE_THRESHOLDS.bucket }, tiers: { ...DEFAULT_INTELLIGENCE_THRESHOLDS.tiers }, recommendations: { ...DEFAULT_INTELLIGENCE_THRESHOLDS.recommendations } };
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      bucket: { ...DEFAULT_INTELLIGENCE_THRESHOLDS.bucket, ...p.bucket },
      tiers: { ...DEFAULT_INTELLIGENCE_THRESHOLDS.tiers, ...p.tiers },
      recommendations: { ...DEFAULT_INTELLIGENCE_THRESHOLDS.recommendations, ...p.recommendations },
    };
  } catch {
    return parseThresholdsJson(null);
  }
}

export function thresholdsFromOrg(org) {
  const fromJson = parseThresholdsJson(org?.intelligence_thresholds_json);
  return {
    ...fromJson,
    bucket: {
      green: org?.default_green_threshold ?? fromJson.bucket.green,
      amber: org?.default_amber_threshold ?? fromJson.bucket.amber,
    },
  };
}

export function thresholdsFromJob(job, org) {
  const base = thresholdsFromOrg(org);
  if (job?.green_threshold != null || job?.amber_threshold != null) {
    return {
      ...base,
      bucket: {
        green: job.green_threshold ?? base.bucket.green,
        amber: job.amber_threshold ?? base.bucket.amber,
      },
    };
  }
  return base;
}

export function tierFromScore(overall, thresholds) {
  const t = thresholds?.tiers || DEFAULT_INTELLIGENCE_THRESHOLDS.tiers;
  if (overall >= t.exceptional) return 'Exceptional Match';
  if (overall >= t.strong) return 'Strong Match';
  if (overall >= t.potential) return 'Potential Match';
  if (overall >= t.needs_review) return 'Needs Review';
  return 'Low Match';
}

export function recommendationFromScore(overall, thresholds) {
  const r = thresholds?.recommendations || DEFAULT_INTELLIGENCE_THRESHOLDS.recommendations;
  if (overall >= r.strongly_recommend) return 'Strongly Recommend Interview';
  if (overall >= r.recommend) return 'Recommend Interview';
  if (overall >= r.review) return 'Recruiter Review Needed';
  return 'Not Recommended';
}

export function bucketFromOverall(overall, thresholds) {
  const b = thresholds?.bucket || DEFAULT_INTELLIGENCE_THRESHOLDS.bucket;
  if (overall >= b.green) return 'Green';
  if (overall >= b.amber) return 'Amber';
  return 'Red';
}

export function validateThresholds(t) {
  const tiers = t.tiers || {};
  const rec = t.recommendations || {};
  const bucket = t.bucket || {};
  if (tiers.exceptional < tiers.strong || tiers.strong < tiers.potential || tiers.potential < tiers.needs_review) {
    return { ok: false, error: 'Tier thresholds must descend: Exceptional ≥ Strong ≥ Potential ≥ Needs Review' };
  }
  if (rec.strongly_recommend < rec.recommend || rec.recommend < rec.review) {
    return { ok: false, error: 'Recommendation thresholds must descend' };
  }
  if (bucket.green <= bucket.amber) {
    return { ok: false, error: 'Green bucket threshold must be higher than Amber' };
  }
  return { ok: true };
}
