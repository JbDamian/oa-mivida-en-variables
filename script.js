"use strict";

const colors = {
  violeta: {
    label: "Violeta",
    background: "#eee6f8",
    base: "#bba1df",
    medium: "#9f83ca",
    dark: "#8c6db1",
    light: "#d4c1eb",
  },
  verde: {
    label: "Verde",
    background: "#e2f1e8",
    base: "#8ec7a8",
    medium: "#6eab8b",
    dark: "#50876e",
    light: "#b9dec9",
  },
  naranja: {
    label: "Naranja",
    background: "#f9eadf",
    base: "#efac7f",
    medium: "#df8e63",
    dark: "#bc6b44",
    light: "#f6c8a7",
  },
};

const form = document.querySelector("#character-form");
const nameInput = document.querySelector("#name");
const ageInput = document.querySelector("#age");
const resultTitle = document.querySelector("#result-title");
const card = document.querySelector("#character-card");
const portrait = document.querySelector("#portrait");
const illustration = portrait.querySelector("svg");
const downloadButton = document.querySelector("#download");
const downloadError = document.querySelector("#download-error");

let character;

nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  if (!name) {
    nameInput.setCustomValidity("Escribí el nombre de tu personaje.");
    nameInput.reportValidity();
    return;
  }

  character = {
    name,
    age: ageInput.valueAsNumber,
    color: colors[new FormData(form).get("color")],
  };

  document.querySelector("#result-name").textContent = character.name;
  document.querySelector("#result-age").textContent = formatAge(character.age);
  document.querySelector("#result-color").textContent = character.color.label;
  portrait.style.setProperty("--portrait", character.color.background);

  for (const shape of illustration.querySelectorAll("[data-tone]")) {
    shape.setAttribute("fill", character.color[shape.dataset.tone]);
  }

  downloadError.textContent = "";
  document.querySelector("#empty-result").hidden = true;
  card.hidden = false;
  resultTitle.focus({ preventScroll: true });
  card.scrollIntoView({ block: "nearest" });
});

function formatAge(age) {
  return age === 1 ? "1 año" : `${age} años`;
}

downloadButton.addEventListener("click", async () => {
  const savedCharacter = character;
  downloadButton.disabled = true;
  downloadError.textContent = "";

  try {
    const jpeg = await drawCharacterSheet(savedCharacter);
    const url = URL.createObjectURL(makePdf(jpeg));
    const link = document.createElement("a");
    const name = savedCharacter.name.normalize("NFD")
      .replace(/\p{Mark}/gu, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    link.href = url;
    link.download = `mi-personaje-${name || "ficha"}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch {
    downloadError.textContent = "La descarga falló. Volvé a intentarlo.";
  } finally {
    downloadButton.disabled = false;
  }
});

async function drawCharacterSheet({ name, age, color }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1190;
  canvas.height = 1684;
  const context = canvas.getContext("2d");
  context.scale(2, 2);

  const robot = new Image();
  const svg = new XMLSerializer().serializeToString(illustration);
  robot.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await robot.decode();

  context.fillStyle = "#fff";
  context.fillRect(0, 0, 595, 842);
  context.fillStyle = "#252039";
  context.font = "700 30px Segoe UI, Arial, sans-serif";
  context.fillText("Ficha de personaje", 53, 86);

  context.fillStyle = color.background;
  context.fillRect(53, 119, 489, 360);
  context.drawImage(robot, 127.5, 129, 340, 340);

  drawFact(context, "Nombre", name, 530, 27);
  drawFact(context, "Edad", formatAge(age), 642, 24);
  drawFact(context, "Color", color.label, 729, 24);

  return atob(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]);
}

function drawFact(context, label, value, y, size) {
  context.fillStyle = "#62576e";
  context.font = "600 14px Segoe UI, Arial, sans-serif";
  context.fillText(label, 53, y);
  context.fillStyle = "#252039";
  context.font = `700 ${size}px Segoe UI, Arial, sans-serif`;
  let line = "";
  let baseline = y + size + 6;

  for (const character of value) {
    if (context.measureText(line + character).width > 489) {
      context.fillText(line.trimEnd(), 53, baseline);
      line = "";
      baseline += size + 5;
    }
    line += character;
  }

  context.fillText(line.trimStart(), 53, baseline);
}

function makePdf(jpeg) {
  // El PDF contiene la ficha ilustrada como una imagen en una página A4.
  const image = Uint8Array.from(jpeg, (byte) => byte.charCodeAt(0));
  const drawing = "q 595 0 0 842 0 0 cm /Sheet Do Q\n";
  const objects = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    ["<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Sheet 4 0 R >> >> /Contents 5 0 R >>"],
    [`<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`, image, "\nendstream"],
    [`<< /Length ${drawing.length} >>\nstream\n${drawing}endstream`],
  ];
  const parts = ["%PDF-1.4\n"];
  const offsets = ["0000000000 65535 f \n"];
  let length = parts[0].length;

  for (const [index, object] of objects.entries()) {
    offsets.push(`${String(length).padStart(10, "0")} 00000 n \n`);
    const entry = [`${index + 1} 0 obj\n`, ...object, "\nendobj\n"];
    parts.push(...entry);
    length += entry.reduce((total, part) => total + part.length, 0);
  }

  parts.push(`xref\n0 ${offsets.length}\n${offsets.join("")}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`);
  return new Blob(parts, { type: "application/pdf" });
}
