"use strict";

function now() {
  return Date.now();
}

function parseNumber(value, fallback = 0) {
  const number = Number.parseInt(value, 10);
  return Number.isNaN(number) ? fallback : number;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

module.exports = { now, parseNumber, isPositiveInteger };
