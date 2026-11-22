export const MODEL_VERSION = "single-section-1";

export function validateMeasurements(raw) {
  const values = {};
  const errors = {};

  const labels = {
    top: "Top circumference",
    bottom: "Bottom circumference",
    height: "Section height",
  };

  for (const [name, label] of Object.entries(labels)) {
    const text = String(raw[name] ?? "").trim();
    const value = Number(text);

    if (text === "" || !Number.isFinite(value) || value <= 0) {
      errors[name] = `${label} must be a number greater than zero.`;
    } else {
      values[name] = value;
    }
  }

  return { values, errors };
}

export function calculateTemplate(measurements) {
  const { values, errors } = validateMeasurements(measurements);

  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors).join(" "));
  }

  const { top, bottom, height } = values;

  // A straight section unfolds into a rectangle.
  if (top === bottom) {
    return {
      kind: "cylinder",
      width: top,
      height,
      path: `M 0 0 H ${top} V ${height} H 0 Z`,
      measurements: values,
    };
  }

  // A tapered section unfolds into a curved band.
  const difference = Math.abs(top - bottom);
  const radiusDifference = difference / (2 * Math.PI);
  const slant = Math.hypot(height, radiusDifference);

  const outerRadius = slant * (Math.max(top, bottom) / difference);
  const innerRadius = slant * (Math.min(top, bottom) / difference);
  const angle = difference / slant;

  if (angle < 1e-9) {
    throw new Error(
      "These circumferences are too close for a reliable tapered export. " +
      "Use equal values for a straight section or recheck your measurements."
    );
  }

  const halfAngle = angle / 2;

  const outerX = outerRadius * Math.sin(halfAngle);
  const innerX = innerRadius * Math.sin(halfAngle);

  // This form avoids subtracting two nearly equal numbers.
  const outerY =
    2 * outerRadius * Math.sin(halfAngle / 2) ** 2;

  const innerY =
    slant + 2 * innerRadius * Math.sin(halfAngle / 2) ** 2;

  const horizontalExtent =
    halfAngle >= Math.PI / 2 ? outerRadius : outerX;

  const width = 2 * horizontalExtent;
  const templateHeight = Math.max(outerY, innerY);

  const calculatedValues = [
    slant,
    outerRadius,
    innerRadius,
    angle,
    width,
    templateHeight,
  ];

  const geometryIsValid = calculatedValues.every(
    (value) => Number.isFinite(value) && value > 0
  );

  if (!geometryIsValid) {
    throw new Error(
      "These measurements exceed the supported calculation range."
    );
  }

  const largeArc = angle > Math.PI ? 1 : 0;

  const path = [
    `M ${horizontalExtent - outerX} ${outerY}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${
      horizontalExtent + outerX
    } ${outerY}`,
    `L ${horizontalExtent + innerX} ${innerY}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${
      horizontalExtent - innerX
    } ${innerY}`,
    "Z",
  ].join(" ");

  return {
    kind: "taper",
    width,
    height: templateHeight,
    path,
    slant,
    outerRadius,
    innerRadius,
    angle,
    measurements: values,
  };
}

export function generateSvg(template) {
  const { width, height, path } = template;

  // Leave room around the cut stroke so it is visible when exported.
  const margin = 0.02;
  const canvasWidth = width + 2 * margin;
  const canvasHeight = height + 2 * margin;

  return `<svg
    xmlns="http://www.w3.org/2000/svg"
    width="${canvasWidth}in"
    height="${canvasHeight}in"
    viewBox="0 0 ${canvasWidth} ${canvasHeight}"
  >
    <title>BottleWrap label template</title>
    <desc>
      Print at 100 percent scale and check physical fit with a paper proof.
    </desc>
    <path
      transform="translate(${margin} ${margin})"
      d="${path}"
      fill="none"
      stroke="black"
      stroke-width="0.01"
    />
  </svg>`;
}

export function createSummary(template, review) {
  return {
    project: "BottleWrap Label Planning Assistant",
    modelVersion: MODEL_VERSION,
    units: "in",
    measurements: template.measurements,
    candidateVersion: review.version,
    reviewedAt: review.reviewedAt,
    templateSize: {
      width: template.width,
      height: template.height,
    },
    aiUsed: false,
    allowances: "Trim outline only. Bleed and seam overlap are pending.",
    notice: "Print at 100 percent scale and check fit with a paper proof.",
  };
}