import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Brand colours, same as the website (website/public/css/style.css)
export const C = {
  orange: "#ff6b00",
  orange2: "#ff8a2b",
  gold: "#ffb37a",
  ink: "#0d0b0a",
  dark: "#121010",
  dark2: "#1d1a18",
  white: "#ffffff",
  cream: "#fff1e6",
  whatsapp: "#25d366",
};

// Fonts are bundled in public/dodit-promo/fonts (from Google Fonts, OFL
// licence) so rendering works offline and always looks the same.
const ARABIC = "U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1";
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

const load = (family: string, subset: "arabic" | "latin", weight: string) =>
  loadFont({
    family,
    url: staticFile(`dodit-promo/fonts/${family}-${subset}.woff2`),
    weight,
    unicodeRange: subset === "arabic" ? ARABIC : LATIN,
    format: "woff2",
  });

load("Cairo", "arabic", "200 1000");
load("Cairo", "latin", "200 1000");
load("Lalezar", "arabic", "400");
load("Lalezar", "latin", "400");
load("Montserrat", "latin", "100 900");

export const cairo = "Cairo";
export const lalezar = "Lalezar";
export const montserrat = "Montserrat";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** 6250 -> "٦٬٢٥٠" */
export const arNum = (n: number): string => {
  const s = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return s.replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
};
