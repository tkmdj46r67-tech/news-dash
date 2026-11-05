// sources.js
export const TRENDING_URL =
  "https://ethos6.github.io/free-news-api/v1/trending.json";

// How many stories per country card
export const STORIES_PER_COUNTRY = 5;

// Optional: define which countries you want to show, in order.
// The API uses lowercase ISO codes (us, gb, in, etc.).
export const COUNTRIES = [
  { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" },
  { code: "cn", name: "China" },
  { code: "ru", name: "Russia" },
  { code: "in", name: "India" },
  { code: "de", name: "Germany" },
  { code: "fr", name: "France" },
  { code: "jp", name: "Japan" },
  { code: "br", name: "Brazil" },
  { code: "au", name: "Australia" },
];
// sources.js
export const REGIONS = {
  1: { name: "North America", codes: ["us", "ca", "mx"] },
  2: { name: "South America", codes: ["br", "ar", "cl", "co", "pe", "ve"] },
  3: { name: "Europe", codes: ["gb", "de", "fr", "it", "es", "nl", "se", "pl", "ua", "ru"] },
  4: { name: "Africa", codes: ["za", "ng", "eg", "ke", "et", "ma", "gh"] },
  5: { name: "Middle East", codes: ["il", "ir", "sa", "ae", "tr", "qa", "kw", "om"] },
  6: { name: "South Asia", codes: ["in", "pk", "bd", "lk", "np"] },
  7: { name: "East Asia", codes: ["cn", "jp", "kr", "tw", "vn", "th", "id", "my", "ph"] },
  8: { name: "Oceania", codes: ["au", "nz"] },
};
// sources.js
export const COUNTRY_NAMES = {
  us: "United States", gb: "United Kingdom", cn: "China", ru: "Russia",
  in: "India", de: "Germany", fr: "France", jp: "Japan", br: "Brazil",
  au: "Australia", ca: "Canada", mx: "Mexico", ar: "Argentina", cl: "Chile",
  co: "Colombia", pe: "Peru", ve: "Venezuela", it: "Italy", es: "Spain",
  nl: "Netherlands", se: "Sweden", pl: "Poland", ua: "Ukraine", za: "South Africa",
  ng: "Nigeria", eg: "Egypt", ke: "Kenya", et: "Ethiopia", ma: "Morocco",
  gh: "Ghana", il: "Israel", ir: "Iran", sa: "Saudi Arabia", ae: "UAE",
  tr: "Turkey", qa: "Qatar", kw: "Kuwait", om: "Oman", pk: "Pakistan",
  bd: "Bangladesh", lk: "Sri Lanka", np: "Nepal", kr: "South Korea",
  tw: "Taiwan", vn: "Vietnam", th: "Thailand", id: "Indonesia", my: "Malaysia",
  ph: "Philippines", nz: "New Zealand"
};
