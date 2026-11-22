import {
  validateMeasurements,
  calculateTemplate,
  generateSvg,
  createSummary,
} from "./geometry.js";

const form = document.querySelector("#measurements");
const preview = document.querySelector("#preview");
const dimensions = document.querySelector("#dimensions");
const calculationError = document.querySelector("#calculation-error");
const reviewInput = document.querySelector("#review");
const status = document.querySelector("#status");
const svgButton = document.querySelector("#download-svg");
const summaryButton = document.querySelector("#download-summary");
const feedback = document.querySelector("#feedback");

let candidate = null;
let version = 0;
let review = null;

function updateButtons() {
  const canDownload =
    candidate !== null && review?.version === version;

  svgButton.disabled = !canDownload;
  summaryButton.disabled = !canDownload;

  if (candidate === null) {
    status.textContent = "Invalid";
  } else if (canDownload) {
    status.textContent = "Reviewed";
  } else {
    status.textContent = "Draft";
  }
}

function showPreview(template) {
  const svgNamespace = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(svgNamespace, "svg");

  svg.setAttribute(
    "viewBox",
    `-0.08 -0.08 ${template.width + 0.16} ${
      template.height + 0.16
    }`
  );

  svg.setAttribute("role", "img");

  svg.setAttribute(
    "aria-label",
    template.kind === "cylinder"
      ? "Rectangular label outline"
      : "Curved tapered label outline"
  );

  const path = document.createElementNS(svgNamespace, "path");

  path.setAttribute("d", template.path);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("vector-effect", "non-scaling-stroke");

  svg.append(path);
  preview.append(svg);

  const shape =
    template.kind === "cylinder" ? "Straight" : "Tapered";

  dimensions.textContent =
    `${shape} section · Outline bounds ` +
    `${template.width.toFixed(3)} × ` +
    `${template.height.toFixed(3)} inches`;
}

function updateCandidate() {
  // Every edit creates a new version that needs its own review.
  version += 1;
  candidate = null;
  review = null;

  reviewInput.checked = false;
  preview.replaceChildren();
  dimensions.textContent = "";
  calculationError.textContent = "";
  feedback.textContent = "";

  const raw = Object.fromEntries(new FormData(form));
  const { values, errors } = validateMeasurements(raw);

  for (const name of ["top", "bottom", "height"]) {
    const input = form.elements.namedItem(name);
    const errorElement = document.querySelector(`#${name}-error`);

    input.setAttribute(
      "aria-invalid",
      String(Boolean(errors[name]))
    );

    errorElement.textContent = errors[name] ?? "";
  }

  if (Object.keys(errors).length === 0) {
    try {
      candidate = calculateTemplate(values);
      showPreview(candidate);
    } catch (error) {
      candidate = null;
      preview.replaceChildren();
      dimensions.textContent = "";

      calculationError.textContent =
        error instanceof Error
          ? error.message
          : "The template could not be calculated.";
    }
  }

  reviewInput.disabled = candidate === null;
  updateButtons();
}

function download(kind) {
  if (candidate === null || review?.version !== version) {
    return;
  }

  feedback.textContent = "";
  let url;

  try {
    let content;
    let filename;
    let contentType;

    if (kind === "svg") {
      content = generateSvg(candidate);
      filename = "bottlewrap-template.svg";
      contentType = "image/svg+xml";
    } else {
      const summary = createSummary(candidate, review);

      content = JSON.stringify(summary, null, 2);
      filename = "bottlewrap-record.json";
      contentType = "application/json";
    }

    const blob = new Blob([content], {
      type: contentType,
    });

    url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.append(link);
    link.click();
    link.remove();

    feedback.textContent =
      "Download requested. Check your browser’s downloads.";
  } catch {
    feedback.textContent =
      "The download could not be started. Please try again.";
  } finally {
    if (url) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
});

form.addEventListener("input", updateCandidate);

reviewInput.addEventListener("change", () => {
  if (reviewInput.checked && candidate !== null) {
    review = {
      version,
      reviewedAt: new Date().toISOString(),
    };
  } else {
    review = null;
  }

  updateButtons();
});

svgButton.addEventListener("click", () => {
  download("svg");
});

summaryButton.addEventListener("click", () => {
  download("summary");
});

updateCandidate();