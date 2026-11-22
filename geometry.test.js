import test from "node:test";
import assert from "node:assert/strict";

import {
  validateMeasurements,
  calculateTemplate,
  generateSvg,
} from "./geometry.js";

test("invalid measurements produce field errors", () => {
  for (const height of ["", "0", "-2", "abc"]) {
    const result = validateMeasurements({
      top: "8",
      bottom: "10",
      height,
    });

    assert.ok(result.errors.height);
  }
});

test("equal circumferences produce an 8 by 4 rectangle", () => {
  const result = calculateTemplate({
    top: 8,
    bottom: 8,
    height: 4,
  });

  assert.equal(result.kind, "cylinder");
  assert.equal(result.width, 8);
  assert.equal(result.height, 4);
});

test("taper calculations match an independent 3-4-5 triangle", () => {
  // Container radii are 2 and 5 inches.
  // Their difference is 3. Vertical height is 4.
  // The shoulder's slant height should therefore be 5.
  const result = calculateTemplate({
    top: 4 * Math.PI,
    bottom: 10 * Math.PI,
    height: 4,
  });

  const tolerance = 0.000001;

  assert.equal(result.kind, "taper");
  assert.ok(Math.abs(result.slant - 5) < tolerance);

  const outerArcLength = result.outerRadius * result.angle;
  const innerArcLength = result.innerRadius * result.angle;

  assert.ok(
    Math.abs(outerArcLength - 10 * Math.PI) < tolerance
  );

  assert.ok(
    Math.abs(innerArcLength - 4 * Math.PI) < tolerance
  );
});

test("SVG export includes physical dimensions in inches", () => {
  const template = calculateTemplate({
    top: 8,
    bottom: 8,
    height: 4,
  });

  const svg = generateSvg(template);

  // The canvas includes a 0.02-inch margin on each side.
  assert.ok(svg.includes('width="8.04in"'));
  assert.ok(svg.includes('height="4.04in"'));
});