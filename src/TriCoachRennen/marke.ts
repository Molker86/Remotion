import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Aus Tri-Coach (frontend/src/styles/tokens.css): Das Video liegt dort auf der
// dunklen Markenfläche und soll nach der App aussehen, nicht nach Stockmaterial.
export const FARBE = {
  ink: "#070c18",
  inkRgb: "7 12 24",
  blauRgb: "39 83 224",
  volt: "#c6f432",
  voltRgb: "198 244 50",
  hell: "#eef2f8",
  hellRgb: "238 242 248",
  gedaempft: "#9aa7bd",
} as const;

// Dieselben Schriften wie die App: Archivo schmal gestellt für alles, was
// laut sein soll, Inter für den Rest. Beide variabel, eine Datei je Schnitt.
export const SCHRIFT = {
  anzeige: "Archivo",
  text: "Inter",
} as const;

void Promise.all([
  loadFont({
    family: SCHRIFT.anzeige,
    url: staticFile("fonts/archivo-latin-wdth-normal.woff2"),
    weight: "100 900",
    stretch: "62% 125%",
    style: "normal",
  }),
  loadFont({
    family: SCHRIFT.anzeige,
    url: staticFile("fonts/archivo-latin-wdth-italic.woff2"),
    weight: "100 900",
    stretch: "62% 125%",
    style: "italic",
  }),
  loadFont({
    family: SCHRIFT.text,
    url: staticFile("fonts/inter-latin-wght-normal.woff2"),
    weight: "100 900",
    style: "normal",
  }),
]);

/** Hochformat für die Markenhälfte am Schreibtisch, Band für das Telefon. */
export type Format = "hoch" | "band";
