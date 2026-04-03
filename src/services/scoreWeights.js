const BASE_SCORE_WEIGHTS = {
  trend: {
    emaCross: 8,
    smaAlignment: 8,
    priceAboveEma20: 5,
    priceAboveSma200: 5,
    adxDirectional: 4,
  },
  momentum: {
    macdCross: 8,
    histogramImprove: 4,
    rsiBalanced: 6,
    rsiRebound: 7,
    rsiOverheatedPenalty: -6,
    rsiOversoldPenalty: -6,
  },
  volume: {
    surge: 8,
    directionalSupport: 5,
    directionalBreakdownSupport: 7,
    obvConfirm: 4,
    obvConfirmSell: 5,
    breakoutBonus: 3,
    lowVolumePenalty: -4,
  },
  location: {
    supportBounce: 6,
    resistanceBreakout: 8,
    aboveBbMiddle: 3,
    aboveBbUpperPenalty: -3,
    nearResistancePenalty: -6,
    nearResistanceReject: 5,
    belowSupportBreak: 8,
    belowBbLower: 2,
  },
  risk: {
    lowAtrBonus: 5,
    highAtrPenalty: -3,
    highAtrSellBonus: 5,
    rewardRiskBonus: 5,
  },
};

export const SUPPORTED_STRATEGIES = ['balanced', 'trend_following', 'mean_reversion'];

const PROFILE_OVERRIDES = {
  kr_standard: {
    trend: {
      emaCross: 7,
      smaAlignment: 7,
      priceAboveEma20: 4,
      priceAboveSma200: 5,
      adxDirectional: 3,
    },
    momentum: {
      rsiBalanced: 5,
      rsiRebound: 8,
      rsiOverheatedPenalty: -7,
      rsiOversoldPenalty: -5,
    },
    volume: {
      surge: 6,
      directionalSupport: 4,
      directionalBreakdownSupport: 8,
      breakoutBonus: 1,
      lowVolumePenalty: -5,
    },
    location: {
      supportBounce: 8,
      resistanceBreakout: 5,
      aboveBbMiddle: 2,
      nearResistancePenalty: -8,
      nearResistanceReject: 6,
      belowSupportBreak: 9,
    },
    risk: {
      lowAtrBonus: 4,
      highAtrPenalty: -5,
      highAtrSellBonus: 6,
      rewardRiskBonus: 6,
    },
  },
  us_megacap_growth: {
    trend: {
      emaCross: 10,
      smaAlignment: 9,
      priceAboveEma20: 6,
      priceAboveSma200: 6,
      adxDirectional: 5,
    },
    momentum: {
      histogramImprove: 5,
      rsiBalanced: 5,
      rsiRebound: 6,
      rsiOverheatedPenalty: -5,
    },
    volume: {
      surge: 9,
      directionalSupport: 6,
      obvConfirm: 5,
      breakoutBonus: 5,
      lowVolumePenalty: -3,
    },
    location: {
      supportBounce: 5,
      resistanceBreakout: 10,
      aboveBbMiddle: 4,
      nearResistancePenalty: -4,
      nearResistanceReject: 4,
      belowSupportBreak: 7,
    },
    risk: {
      lowAtrBonus: 4,
      highAtrPenalty: -2,
      rewardRiskBonus: 4,
    },
  },
  us_broad_large_cap: {
    trend: {
      emaCross: 8,
      smaAlignment: 8,
      priceAboveEma20: 5,
      priceAboveSma200: 5,
      adxDirectional: 4,
    },
    momentum: {
      rsiBalanced: 6,
      rsiRebound: 7,
    },
    volume: {
      surge: 8,
      directionalSupport: 5,
      breakoutBonus: 3,
    },
    location: {
      supportBounce: 6,
      resistanceBreakout: 8,
      aboveBbMiddle: 3,
      nearResistancePenalty: -6,
    },
    risk: {
      lowAtrBonus: 5,
      highAtrPenalty: -3,
      rewardRiskBonus: 5,
    },
  },
};

const STRATEGY_OVERRIDES = {
  balanced: {},
  trend_following: {
    trend: {
      emaCross: 10,
      smaAlignment: 10,
      priceAboveEma20: 6,
      priceAboveSma200: 6,
      adxDirectional: 6,
    },
    momentum: {
      rsiBalanced: 4,
      rsiRebound: 5,
    },
    volume: {
      surge: 10,
      directionalSupport: 6,
      breakoutBonus: 5,
    },
    location: {
      supportBounce: 4,
      resistanceBreakout: 10,
      nearResistancePenalty: -4,
    },
  },
  mean_reversion: {
    trend: {
      emaCross: 5,
      smaAlignment: 5,
      priceAboveEma20: 3,
      priceAboveSma200: 4,
      adxDirectional: 2,
    },
    momentum: {
      macdCross: 6,
      histogramImprove: 3,
      rsiBalanced: 4,
      rsiRebound: 10,
      rsiOverheatedPenalty: -8,
      rsiOversoldPenalty: -8,
    },
    volume: {
      surge: 5,
      directionalSupport: 3,
      breakoutBonus: 1,
    },
    location: {
      supportBounce: 10,
      resistanceBreakout: 4,
      aboveBbMiddle: 2,
      aboveBbUpperPenalty: -5,
      nearResistancePenalty: -8,
      nearResistanceReject: 7,
      belowSupportBreak: 6,
      belowBbLower: 5,
    },
    risk: {
      lowAtrBonus: 4,
      highAtrPenalty: -5,
      highAtrSellBonus: 4,
    },
  },
};

export function getScoreWeights(strategy = 'balanced', profile = 'us_broad_large_cap') {
  const normalized = SUPPORTED_STRATEGIES.includes(strategy) ? strategy : 'balanced';
  const profileOverrides = PROFILE_OVERRIDES[profile] || {};
  const overrides = STRATEGY_OVERRIDES[normalized] || {};
  const merged = structuredClone(BASE_SCORE_WEIGHTS);

  for (const [section, values] of Object.entries(profileOverrides)) {
    merged[section] = {
      ...merged[section],
      ...values,
    };
  }

  for (const [section, values] of Object.entries(overrides)) {
    merged[section] = {
      ...merged[section],
      ...values,
    };
  }

  return merged;
}

export const SCORE_WEIGHTS = getScoreWeights('balanced', 'us_broad_large_cap');
