class LandConverter {
  static toHectares(sqFeet = 0, cents = 0) {
    const totalSqFeet = sqFeet + (cents * 435.6);
    const hectares = totalSqFeet / 107639.104;
    return Math.round(hectares * 100) / 100;
  }

  static toSquareFeet(hectares) {
    return hectares * 107639.104;
  }

  static toCents(hectares) {
    return hectares * 247.105;
  }

  static toAcres(hectares) {
    return hectares * 2.47105;
  }

  static acresToHectares(acres) {
    return acres / 2.47105;
  }

  static squareFeetToAcres(sqFeet) {
    return sqFeet / 43560;
  }

  static acresToSquareFeet(acres) {
    return acres * 43560;
  }
}

module.exports = LandConverter;

