export const ENGLISH_STARTER_VOCABULARY = [
  { term: "sedentary", definition: "Involving little activity." },
  { term: "savoury", definition: "Salty or spicy, not sweet." },
  { term: "leisurely", definition: "Relaxed and unhurried." },
  { term: "intermission", definition: "A short break in a show." },
  { term: "urge", definition: "A strong sudden desire." },
  { term: "to wrap up sth", definition: "Finish something." },
  {
    term: "to take sth into account",
    definition: "Consider it when deciding.",
  },
  {
    term: "to be in charge of sth",
    definition: "Be responsible for it.",
  },
  { term: "on the contrary", definition: "The opposite is true." },
  { term: "to a certain extent", definition: "Partly, not completely." },
] as const;

export const CZECH_STARTER_VOCABULARY = [
  { term: "dát si kávu", definition: "Have a coffee." },
  { term: "těšit se na něco", definition: "Look forward to something." },
  { term: "dávat smysl", definition: "Make sense." },
  { term: "mít pravdu", definition: "Be right." },
  { term: "záležet na něčem", definition: "Depend on something." },
  { term: "přijít včas", definition: "Arrive on time." },
  { term: "mít na něco chuť", definition: "Feel like having something." },
  { term: "být na cestě", definition: "Be on the way." },
  { term: "poradit si s něčím", definition: "Cope with something." },
  { term: "zvyknout si na něco", definition: "Get used to something." },
] as const;

// Backward-compatible name for the default English app.
export const STARTER_VOCABULARY = ENGLISH_STARTER_VOCABULARY;
