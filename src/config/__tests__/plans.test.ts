import { describe, it, expect } from 'vitest';
import { hasAccess, FEATURE_MIN_PLAN, type SubscriptionPlan } from '../plans';

describe('plans config & hasAccess', () => {
  it('should grant access to free plan features for all plans', () => {
    const plans: SubscriptionPlan[] = ['free', 'starter', 'growth', 'pro', 'business'];
    plans.forEach(plan => {
      expect(hasAccess(plan, 'free')).toBe(true);
    });
  });

  it('should deny free plan access to starter features', () => {
    expect(hasAccess('free', 'starter')).toBe(false);
  });

  it('should grant starter plan access to starter features and below', () => {
    expect(hasAccess('starter', 'free')).toBe(true);
    expect(hasAccess('starter', 'starter')).toBe(true);
  });

  it('should follow hierarchy for higher plans', () => {
    expect(hasAccess('growth', 'starter')).toBe(true);
    expect(hasAccess('pro', 'growth')).toBe(true);
    expect(hasAccess('business', 'pro')).toBe(true);
  });

  describe('FEATURE_MIN_PLAN check', () => {
    it('integrations page should be accessible to all', () => {
        expect(FEATURE_MIN_PLAN['settings/integrations']).toBe('free');
    });

    it('webhooks should be accessible to all', () => {
        expect(FEATURE_MIN_PLAN['settings/webhooks']).toBe('free');
    });

    it('calendar should be accessible to all', () => {
        expect(FEATURE_MIN_PLAN['calendar']).toBe('free');
    });
  });
});
