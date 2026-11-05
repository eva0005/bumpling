/* ==========================================================================
   Regional Standards Engine (PRD §5)
   Language and clinical-standard region are DECOUPLED. This file holds the
   per-region "standard packs": BMI cut-points, gestational weight gain (GWG)
   ranges, nutrition targets, prenatal visit templates, alert thresholds,
   units and emergency numbers.

   ⚠️ All clinical values must be re-verified by a locally licensed medical
   reviewer before release (PRD §12.1). Values below follow the PRD tables.
   ========================================================================== */
(function (global) {
  'use strict';

  // --- BMI cut-points ------------------------------------------------------
  const BMI_CN = { under: 18.5, normal: 24.0, over: 28.0 };   // WS/T 428-2013
  const BMI_WHO = { under: 18.5, normal: 25.0, over: 30.0 };  // WHO / IOM

  // --- GWG tables ----------------------------------------------------------
  // total: total gain [kg] for singleton; t1: first-trimester gain [kg];
  // rate: 2nd/3rd trimester weekly gain {mean, low, high} [kg/wk]
  const GWG_CN = { // WS/T 801-2022
    under:  { total: [11, 16], t1: [0, 2], rate: { mean: 0.46, low: 0.37, high: 0.56 } },
    normal: { total: [8, 14],  t1: [0, 2], rate: { mean: 0.37, low: 0.26, high: 0.48 } },
    over:   { total: [7, 11],  t1: [0, 2], rate: { mean: 0.30, low: 0.22, high: 0.37 } },
    obese:  { total: [5, 9],   t1: [0, 2], rate: { mean: 0.22, low: 0.15, high: 0.30 } },
  };
  const GWG_IOM = { // IOM 2009
    under:  { total: [12.5, 18], t1: [0.5, 2], rate: { mean: 0.51, low: 0.44, high: 0.58 } },
    normal: { total: [11.5, 16], t1: [0.5, 2], rate: { mean: 0.42, low: 0.35, high: 0.50 } },
    over:   { total: [7, 11.5],  t1: [0.5, 2], rate: { mean: 0.28, low: 0.23, high: 0.33 } },
    obese:  { total: [5, 9],     t1: [0.5, 2], rate: { mean: 0.22, low: 0.17, high: 0.27 } },
  };
  // IOM provisional guidelines for twin pregnancies (no guideline for underweight)
  const GWG_TWIN_IOM = {
    under:  null,
    normal: { total: [17, 25], t1: [0.5, 2], rate: { mean: 0.78, low: 0.61, high: 0.85 } },
    over:   { total: [14, 23], t1: [0.5, 2], rate: { mean: 0.65, low: 0.50, high: 0.78 } },
    obese:  { total: [11, 19], t1: [0.5, 2], rate: { mean: 0.55, low: 0.39, high: 0.63 } },
  };

  // --- Nutrition targets ---------------------------------------------------
  // energyExtra by trimester [kcal], nutrients by trimester index 0..2
  const NUT_CN = { // Chinese DRIs 2023
    energyExtra: [0, 250, 400],
    protein: [55, 70, 85],            // g
    folate: [600, 600, 600],          // μg DFE (incl. 400 μg supplement)
    iron: [20, 24, 29],               // mg
    calcium: [800, 1000, 1000],       // mg
    iodine: [230, 230, 230],          // μg
    dha: [200, 200, 200],             // mg
    fibre: [25, 25, 25],              // g (DRIs 2023 AI 25–30 g/d)
    caffeineMax: 200,                 // mg
    sourceKey: 'src.cn.nutrition',
  };
  const NUT_US = { // IOM DRIs / ACOG
    energyExtra: [0, 340, 452],
    protein: [71, 71, 71],
    folate: [600, 600, 600],
    iron: [27, 27, 27],
    calcium: [1000, 1000, 1000],
    iodine: [220, 220, 220],
    dha: [200, 200, 200],
    fibre: [28, 28, 28],              // g (IOM AI, pregnancy)
    caffeineMax: 200,
    sourceKey: 'src.us.nutrition',
  };
  const NUT_UK = { // NHS / NICE / SACN
    energyExtra: [0, 0, 200],
    protein: [51, 51, 51],
    folate: [400, 400, 400],          // folic acid supplement until 12 wks; dietary folate ~300 μg
    iron: [14.8, 14.8, 14.8],
    calcium: [700, 700, 700],
    iodine: [140, 140, 140],
    dha: [200, 200, 200],
    fibre: [30, 30, 30],              // g (SACN 2015)
    caffeineMax: 200,
    sourceKey: 'src.uk.nutrition',
  };
  const NUT_INTL = { // WHO + IOM
    energyExtra: [0, 340, 452],
    protein: [71, 71, 71],
    folate: [400, 400, 400],
    iron: [30, 30, 30],
    calcium: [1000, 1000, 1000],
    iodine: [250, 250, 250],
    dha: [200, 200, 200],
    fibre: [28, 28, 28],              // g (IOM AI)
    caffeineMax: 200,
    sourceKey: 'src.intl.nutrition',
  };

  // --- Prenatal visit templates (PRD §5.4) ---------------------------------
  // Each item: id, from (week), to (week), titleKey, noteKey (optional)
  const CAL_CN = [
    { id: 'cn-confirm', from: 6, to: 8, title: 'cal.cn.confirm', note: 'cal.cn.confirm.n' },
    { id: 'cn-booking', from: 11, to: 13, title: 'cal.cn.booking', note: 'cal.cn.booking.n' },
    { id: 'cn-nt', from: 11, to: 13, title: 'cal.cn.nt', note: 'cal.cn.nt.n' },
    { id: 'cn-screen', from: 15, to: 20, title: 'cal.cn.screen', note: 'cal.cn.screen.n' },
    { id: 'cn-v16', from: 16, to: 18, title: 'cal.routine' },
    { id: 'cn-anomaly', from: 20, to: 24, title: 'cal.cn.anomaly', note: 'cal.cn.anomaly.n' },
    { id: 'cn-ogtt', from: 24, to: 28, title: 'cal.cn.ogtt', note: 'cal.cn.ogtt.n' },
    { id: 'cn-v30', from: 30, to: 32, title: 'cal.cn.v30', note: 'cal.cn.v30.n' },
    { id: 'cn-v34', from: 34, to: 34, title: 'cal.routine' },
    { id: 'cn-gbs', from: 35, to: 37, title: 'cal.cn.gbs', note: 'cal.cn.gbs.n' },
    { id: 'cn-v36', from: 36, to: 36, title: 'cal.cn.nst', note: 'cal.cn.nst.n' },
    { id: 'cn-v37', from: 37, to: 37, title: 'cal.weekly' },
    { id: 'cn-v38', from: 38, to: 38, title: 'cal.weekly' },
    { id: 'cn-v39', from: 39, to: 39, title: 'cal.weekly' },
    { id: 'cn-v40', from: 40, to: 40, title: 'cal.weekly', note: 'cal.cn.v40.n' },
  ];
  const CAL_US = [
    { id: 'us-first', from: 8, to: 10, title: 'cal.us.first', note: 'cal.us.first.n' },
    { id: 'us-nt', from: 10, to: 13, title: 'cal.us.nt', note: 'cal.us.nt.n' },
    { id: 'us-v12', from: 12, to: 12, title: 'cal.routine' },
    { id: 'us-quad', from: 15, to: 20, title: 'cal.us.quad', note: 'cal.us.quad.n' },
    { id: 'us-v16', from: 16, to: 16, title: 'cal.routine' },
    { id: 'us-anatomy', from: 18, to: 22, title: 'cal.us.anatomy', note: 'cal.us.anatomy.n' },
    { id: 'us-v24', from: 24, to: 24, title: 'cal.routine' },
    { id: 'us-gct', from: 24, to: 28, title: 'cal.us.gct', note: 'cal.us.gct.n' },
    { id: 'us-v28', from: 28, to: 28, title: 'cal.us.v28', note: 'cal.us.v28.n' },
    { id: 'us-v30', from: 30, to: 30, title: 'cal.biweekly' },
    { id: 'us-v32', from: 32, to: 32, title: 'cal.biweekly' },
    { id: 'us-v34', from: 34, to: 34, title: 'cal.biweekly' },
    { id: 'us-gbs', from: 36, to: 37, title: 'cal.us.gbs', note: 'cal.us.gbs.n' },
    { id: 'us-v37', from: 37, to: 37, title: 'cal.weekly' },
    { id: 'us-v38', from: 38, to: 38, title: 'cal.weekly' },
    { id: 'us-v39', from: 39, to: 39, title: 'cal.weekly' },
    { id: 'us-v40', from: 40, to: 40, title: 'cal.weekly', note: 'cal.us.v40.n' },
  ];
  const CAL_UK = [
    { id: 'uk-booking', from: 8, to: 10, title: 'cal.uk.booking', note: 'cal.uk.booking.n' },
    { id: 'uk-dating', from: 10, to: 14, title: 'cal.uk.dating', note: 'cal.uk.dating.n' },
    { id: 'uk-v16', from: 16, to: 16, title: 'cal.uk.midwife', note: 'cal.uk.v16.n' },
    { id: 'uk-anomaly', from: 18, to: 20, title: 'cal.uk.anomaly', note: 'cal.uk.anomaly.n' },
    { id: 'uk-v25', from: 25, to: 25, title: 'cal.uk.midwife', note: 'cal.uk.firstonly' },
    { id: 'uk-ogtt', from: 24, to: 28, title: 'cal.uk.ogtt', note: 'cal.uk.ogtt.n' },
    { id: 'uk-v28', from: 28, to: 28, title: 'cal.uk.midwife', note: 'cal.uk.v28.n' },
    { id: 'uk-v31', from: 31, to: 31, title: 'cal.uk.midwife', note: 'cal.uk.firstonly' },
    { id: 'uk-v34', from: 34, to: 34, title: 'cal.uk.midwife', note: 'cal.uk.v34.n' },
    { id: 'uk-v36', from: 36, to: 36, title: 'cal.uk.midwife', note: 'cal.uk.v36.n' },
    { id: 'uk-v38', from: 38, to: 38, title: 'cal.uk.midwife' },
    { id: 'uk-v40', from: 40, to: 40, title: 'cal.uk.midwife', note: 'cal.uk.firstonly' },
    { id: 'uk-v41', from: 41, to: 41, title: 'cal.uk.midwife', note: 'cal.uk.v41.n' },
  ];
  const CAL_INTL = [ // WHO 2016 ANC model: 8 contacts
    { id: 'in-c1', from: 8, to: 12, title: 'cal.intl.c1', note: 'cal.intl.c1.n' },
    { id: 'in-nt', from: 11, to: 14, title: 'cal.intl.nt', note: 'cal.intl.nt.n' },
    { id: 'in-anomaly', from: 18, to: 22, title: 'cal.intl.anomaly' },
    { id: 'in-c2', from: 20, to: 20, title: 'cal.intl.contact' },
    { id: 'in-ogtt', from: 24, to: 28, title: 'cal.intl.ogtt', note: 'cal.intl.ogtt.n' },
    { id: 'in-c3', from: 26, to: 26, title: 'cal.intl.contact' },
    { id: 'in-c4', from: 30, to: 30, title: 'cal.intl.contact' },
    { id: 'in-c5', from: 34, to: 34, title: 'cal.intl.contact' },
    { id: 'in-c6', from: 36, to: 36, title: 'cal.intl.contact', note: 'cal.intl.c6.n' },
    { id: 'in-c7', from: 38, to: 38, title: 'cal.intl.contact' },
    { id: 'in-c8', from: 40, to: 40, title: 'cal.intl.contact', note: 'cal.intl.c8.n' },
  ];

  // --- Thresholds (PRD §5.5, globally unified) ----------------------------
  const THRESHOLDS = {
    bp: { sys: 140, dia: 90 },                       // mmHg
    glucose: { fasting: 5.3, pp1h: 7.8, pp2h: 6.7 }, // mmol/L (stored unit)
    weeklyGainSurge: 1.0,                            // kg in 7 days
    deviationWeeks: 2,                               // consecutive weeks out of band
    kicksMinPer2h: 10,
    activityMinPerWeek: 150,
  };

  // --- Region packs --------------------------------------------------------
  const REGIONS = {
    CN: {
      id: 'CN', flag: '🇨🇳', nameKey: 'region.CN', bmi: BMI_CN, gwg: GWG_CN, twin: GWG_TWIN_IOM,
      nutrition: NUT_CN, calendar: CAL_CN, gwgSourceKey: 'src.cn.gwg',
      defaultUnits: { weight: 'kg', height: 'cm', glucose: 'mmol', energy: 'kcal' },
      weekFormat: 'sup', dietVariant: 'cn', noteKey: null,
    },
    US: {
      id: 'US', flag: '🇺🇸', nameKey: 'region.US', bmi: BMI_WHO, gwg: GWG_IOM, twin: GWG_TWIN_IOM,
      nutrition: NUT_US, calendar: CAL_US, gwgSourceKey: 'src.iom.gwg',
      defaultUnits: { weight: 'lb', height: 'ftin', glucose: 'mgdl', energy: 'kcal' },
      weekFormat: 'wd', dietVariant: 'intl', noteKey: null,
    },
    UK: {
      id: 'UK', flag: '🇬🇧', nameKey: 'region.UK', bmi: BMI_WHO, gwg: GWG_IOM, twin: GWG_TWIN_IOM,
      nutrition: NUT_UK, calendar: CAL_UK, gwgSourceKey: 'src.iom.gwg',
      defaultUnits: { weight: 'kg', height: 'cm', glucose: 'mmol', energy: 'kcal' },
      weekFormat: 'wd', dietVariant: 'intl', noteKey: 'region.UK.note',
    },
    INTL: {
      id: 'INTL', flag: '🌍', nameKey: 'region.INTL', bmi: BMI_WHO, gwg: GWG_IOM, twin: GWG_TWIN_IOM,
      nutrition: NUT_INTL, calendar: CAL_INTL, gwgSourceKey: 'src.iom.gwg',
      defaultUnits: { weight: 'kg', height: 'cm', glucose: 'mmol', energy: 'kcal' },
      weekFormat: 'wd', dietVariant: 'intl', noteKey: 'region.INTL.note',
    },
  };

  // --- Countries → region pack + emergency number + unit tweaks ------------
  const COUNTRIES = [
    { code: 'CN', flag: '🇨🇳', region: 'CN', emergency: '120', nameKey: 'country.CN' },
    { code: 'US', flag: '🇺🇸', region: 'US', emergency: '911', nameKey: 'country.US' },
    { code: 'GB', flag: '🇬🇧', region: 'UK', emergency: '999', nameKey: 'country.GB' },
    { code: 'CA', flag: '🇨🇦', region: 'INTL', emergency: '911', nameKey: 'country.CA' },
    { code: 'AU', flag: '🇦🇺', region: 'INTL', emergency: '000', nameKey: 'country.AU', units: { energy: 'kJ' } },
    { code: 'NZ', flag: '🇳🇿', region: 'INTL', emergency: '111', nameKey: 'country.NZ', units: { energy: 'kJ' } },
    { code: 'SG', flag: '🇸🇬', region: 'INTL', emergency: '995', nameKey: 'country.SG' },
    { code: 'IE', flag: '🇮🇪', region: 'INTL', emergency: '112', nameKey: 'country.IE' },
    { code: 'DE', flag: '🇩🇪', region: 'INTL', emergency: '112', nameKey: 'country.DE', units: { glucose: 'mgdl' } },
    { code: 'FR', flag: '🇫🇷', region: 'INTL', emergency: '112', nameKey: 'country.FR', units: { glucose: 'mgdl' } },
    { code: 'JP', flag: '🇯🇵', region: 'INTL', emergency: '119', nameKey: 'country.JP', units: { glucose: 'mgdl' } },
    { code: 'MY', flag: '🇲🇾', region: 'INTL', emergency: '999', nameKey: 'country.MY' },
    { code: 'OTHER', flag: '🌍', region: 'INTL', emergency: '112', nameKey: 'country.OTHER' },
  ];

  // --- Unit conversion (internal storage is ALWAYS metric: kg, cm, mmol/L, kcal)
  const Units = {
    kgToLb: kg => kg * 2.2046226218,
    lbToKg: lb => lb / 2.2046226218,
    cmToFtIn: cm => { const inches = cm / 2.54; const ft = Math.floor(inches / 12); return { ft, in: Math.round((inches - ft * 12) * 10) / 10 }; },
    ftInToCm: (ft, inch) => (ft * 12 + inch) * 2.54,
    mmolToMgdl: v => v * 18.0182,
    mgdlToMmol: v => v / 18.0182,
    kcalToKj: v => v * 4.184,
    kjToKcal: v => v / 4.184,
  };

  global.Standards = {
    REGIONS, COUNTRIES, THRESHOLDS, Units,
    region(id) { return REGIONS[id] || REGIONS.INTL; },
    country(code) { return COUNTRIES.find(c => c.code === code) || COUNTRIES[COUNTRIES.length - 1]; },
    bmiCategory(bmi, regionId) {
      const c = this.region(regionId).bmi;
      if (bmi < c.under) return 'under';
      if (bmi < c.normal) return 'normal';
      if (bmi < c.over) return 'over';
      return 'obese';
    },
    gwgTable(regionId, category, multiple) {
      const r = this.region(regionId);
      if (multiple) return r.twin[category] || null;
      return r.gwg[category];
    },
    defaultUnitsFor(countryCode) {
      const c = this.country(countryCode);
      return Object.assign({}, this.region(c.region).defaultUnits, c.units || {});
    },
  };
})(window);
