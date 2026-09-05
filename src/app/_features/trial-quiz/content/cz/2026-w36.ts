import cafe from "../../../../../../marketing/videos/episodes/cz/cafe.json";
import clothing from "../../../../../../marketing/videos/episodes/cz/clothing.json";
import furniture from "../../../../../../marketing/videos/episodes/cz/furniture.json";
import home from "../../../../../../marketing/videos/episodes/cz/home.json";
import medicine from "../../../../../../marketing/videos/episodes/cz/medicine.json";
import transport from "../../../../../../marketing/videos/episodes/cz/transport.json";
import vegetables from "../../../../../../marketing/videos/episodes/cz/vegetables.json";

import { parseTrialQuizManifest } from "@/app/_features/trial-quiz/domain/trial-quiz-manifest";

const currentTrialInput = {
  id: "2026-w36",
  languageId: "cz",
  episodeIds: [
    "home",
    "transport",
    "furniture",
    "medicine",
    "vegetables",
    "cafe",
    "clothing",
  ],
  cards: [
    {
      source: { episodeId: "home", itemSlug: "postel" },
      sentence: "Hlavní kus nábytku na spaní v ložnici je ___.",
      answer: "postel",
      options: ["postel", "skříň", "židle", "lampa"],
    },
    {
      source: { episodeId: "transport", itemSlug: "tramvaj" },
      sentence: "Městský dopravní prostředek, který jezdí po kolejích, je ___.",
      answer: "tramvaj",
      options: ["tramvaj", "letadlo", "kolo", "auto"],
    },
    {
      source: { episodeId: "furniture", itemSlug: "pohovka" },
      sentence: "Velké měkké sedadlo pro několik lidí se nazývá ___.",
      answer: "pohovka",
      options: ["pohovka", "křeslo", "koberec", "zásuvka"],
    },
    {
      source: { episodeId: "furniture", itemSlug: "zrcadlo" },
      sentence: "Před odchodem se podívám do ___, abych zkontroloval svůj vzhled.",
      answer: "zrcadla",
      options: ["zrcadla", "zásuvky", "skříně", "lampy"],
    },
    {
      source: { episodeId: "medicine", itemSlug: "teplomer" },
      sentence: "Když máme horečku, její výši nám ukáže ___.",
      answer: "teploměr",
      options: ["teploměr", "obvaz", "náplast", "stetoskop"],
    },
    {
      source: { episodeId: "vegetables", itemSlug: "mrkev" },
      sentence: "Oranžová kořenová zelenina je ___.",
      answer: "mrkev",
      options: ["mrkev", "okurka", "paprika", "brambora"],
    },
    {
      source: { episodeId: "cafe", itemSlug: "ucet" },
      sentence: "Po jídle nám číšník přinese ___ k zaplacení.",
      answer: "účet",
      options: ["účet", "objednávku", "kávu", "jídelní lístek"],
    },
    {
      source: { episodeId: "cafe", itemSlug: "spropitne" },
      sentence: "Dobrovolná částka, kterou necháme obsluze navíc, je ___.",
      answer: "spropitné",
      options: ["spropitné", "účet", "objednávka", "jídelní lístek"],
    },
    {
      source: { episodeId: "clothing", itemSlug: "tricko" },
      sentence: "Kus oblečení s krátkými rukávy je ___.",
      answer: "tričko",
      options: ["tričko", "bunda", "čepice", "kalhoty"],
    },
    {
      source: { episodeId: "clothing", itemSlug: "bunda" },
      sentence: "Když je venku chladno, přes svetr si obléknu ___.",
      answer: "bundu",
      options: ["bundu", "tričko", "kalhoty", "čepici"],
    },
  ],
} as const;

export const trial2026W36 = parseTrialQuizManifest(currentTrialInput, [
  home,
  transport,
  furniture,
  medicine,
  vegetables,
  cafe,
  clothing,
]);
