/*
=========================================================
DPL PLAYER RESUMES
=========================================================

Resume files are stored in:

public/assets/resumes/

This file maps player names to their resume PDF.

Players without submitted resumes:
- Akshita Sriraman
- Hasini J

The helper functions normalize names so small differences
in capitalization / spaces do not break the lookup.
=========================================================
*/

const RESUME_BASE_PATH = "/assets/resumes";

/* =========================================================
   NAME NORMALIZER
========================================================= */

const normalizeName = (name) =>
  String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/* =========================================================
   RESUME FILE MAP
========================================================= */

const RESUME_FILES = {
  "ARAVINDRAN AJAN A": "ARAVINDRAN AJAN A.pdf",
  "UTKARSH SAI SIDHARDH K": "UTKARSH SAI SIDHARDH K.pdf",
  "RITVIK HARIGOVIND B": "RITVIK HARIGOVIND B.pdf",
  "SIVAKARTHICK": "SIVAKARTHICK.pdf",
  "K BUVANESWARAN": "K BUVANESWARAN.pdf",
  "HARISH MANI E": "HARISH MANI E.pdf",
  "YESHWANTH V": "YESHWANTH V.pdf",
  "SITHARTHA": "SITHARTHA.pdf",
  "TEEJAS K": "TEEJAS K.pdf",
  "NITHIYANANDAM S": "NITHIYANANDAM S.pdf",
  "ALLEN JONES T": "ALLEN JONES T.pdf",
  "ASHWIN M": "ASHWIN M.pdf",
  "RITHIC HITESH B": "RITHIC HITESH B.pdf",
  "BIVIN KANTH V": "BIVIN KANTH V.pdf",

  "VISHAL D": "VISHAL D.pdf",
  "LAKSHMI NARAYANAN K": "LAKSHMI NARAYANAN K.pdf",
  "BALAJI B": "Balaji B.pdf",
  "RAGHAVENDHAR R": "Raghavendhar R.pdf",
  "ROHIT RAM JV": "Rohit Ram JV.pdf",
  "DHARMA DARSHAN G": "DHARMA DARSHAN G.pdf",
  "ROHITH SOUNDAR": "ROHITH SOUNDAR.pdf",
  "DINESH G": "Dinesh G.pdf",
  "ADITHYA P": "ADITHYA P.pdf",
  "NITHYA SHIVA THIRUMALAIVARAT": "NITHYA SHIVA THIRUMALAIVARAT...pdf",
  "KIRAN RAJ M": "KIRAN RAJ M.pdf",
  "GOKUL JAYANDAN R S": "GOKUL JAYANDAN R S.PDF",
  "SANTHOSH AG": "SANTHOSH AG.pdf",
  "MUKILASH VK": "MUKILASH VK.pdf",

  "S SHUBHAM": "S SHUBHAM.pdf",
  "BHARATH P": "BHARATH P.pdf",
  "ALAGU MANIKANDAN S": "ALAGU MANIKANDAN S .pdf",
  "JAI KRISHNA PRASATH D": "Jai Krishna Prasath D.pdf",
  "HARI PRASATHY": "HARI PRASATHY.pdf",
  "ASHWIN KUMAR V": "ASWIN KUMAR V.pdf",
  "RAJESHWARI B C": "RAJESHWARI B C.pdf",
  "BALAKRISHNAN R": "BALAKRISHNAN R.pdf",
  "BHUVANESHWARAN B": "BHUVANESHWARAN B.pdf",
  "SRIVIKASINI V": "Srivikasini.V_AD_Resume.pdf",
  "SIVA SAI RAM": "Siva Sai Ram Resume.pdf",
  "AKASH V": "Akash V Resume .pdf",

  "PERIATHAI": "Periathai.pdf",
  "CHANDRU A": "CHANDRU A.pdf",
  "DAWAN BABU K": "Dawan Babu K.pdf",
  "GOKUL M": "GOKUL M.pdf",
  "SANJAY JOSHUA SWAMINATHAN": "Sanjay Joshua Swaminathan.pdf",
  "PRIYANKA A": "Priyanka.A.pdf",
  "KAUSIK T": "KAUSIK T.pdf",
  "PRAKASH M": "Prakash M.pdf",
  "AJITH KUMAR": "Ajith Kumar.pdf",
};

/* =========================================================
   NORMALIZED LOOKUP MAP
========================================================= */

const NORMALIZED_RESUME_FILES = Object.entries(
  RESUME_FILES
).reduce((map, [name, file]) => {
  map[normalizeName(name)] = file;
  return map;
}, {});

/* =========================================================
   RESUME ALIASES
=========================================================

These handle possible differences between the name in
players.js and the name written on the PDF file.
========================================================= */

const RESUME_ALIASES = {
  [normalizeName("GokulJayandan R S")]:
    "GOKUL JAYANDAN R S",

  [normalizeName("Sivakarthick")]:
    "SIVAKARTHICK",

  [normalizeName("Sitharth A")]:
    "SITHARTHA",

  [normalizeName("Sithartha")]:
    "SITHARTHA",

  [normalizeName("Nithiyanandam S")]:
    "NITHIYANANDAM S",

  [normalizeName("Gokul M")]:
    "GOKUL M",

  [normalizeName("Ashwin Kumar V")]:
    "ASHWIN KUMAR V",

  [normalizeName("Srivikasini V")]:
    "SRIVIKASINI V",

  [normalizeName("Akash V")]:
    "AKASH V",
};

/* =========================================================
   GET RESUME FILE
========================================================= */

export const getResumeFile = (playerOrName) => {
  if (!playerOrName) return null;

  const playerName =
    typeof playerOrName === "string"
      ? playerOrName
      : playerOrName.name ??
        playerOrName.playerName ??
        playerOrName.player_name ??
        "";

  const normalizedPlayerName =
    normalizeName(playerName);

  if (!normalizedPlayerName) {
    return null;
  }

  /* Direct match */
  const directMatch =
    NORMALIZED_RESUME_FILES[normalizedPlayerName];

  if (directMatch) {
    return directMatch;
  }

  /* Alias match */
  const aliasName =
    RESUME_ALIASES[normalizedPlayerName];

  if (aliasName) {
    const aliasMatch =
      NORMALIZED_RESUME_FILES[
        normalizeName(aliasName)
      ];

    if (aliasMatch) {
      return aliasMatch;
    }
  }

  /* Partial/fuzzy fallback */
  const matchingEntry = Object.entries(
    NORMALIZED_RESUME_FILES
  ).find(([resumeName]) => {
    return (
      resumeName.includes(normalizedPlayerName) ||
      normalizedPlayerName.includes(resumeName)
    );
  });

  return matchingEntry?.[1] ?? null;
};

/* =========================================================
   GET FULL RESUME URL
========================================================= */

export const getResumeUrl = (playerOrName) => {
  const resumeFile =
    getResumeFile(playerOrName);

  if (!resumeFile) {
    return null;
  }

  return `${RESUME_BASE_PATH}/${encodeURIComponent(
    resumeFile
  )}`;
};

/* =========================================================
   CHECK WHETHER RESUME EXISTS
========================================================= */

export const hasResume = (playerOrName) =>
  Boolean(getResumeFile(playerOrName));

/* =========================================================
   PLAYERS WITHOUT RESUMES
========================================================= */

export const PLAYERS_WITHOUT_RESUME = [
  "Akshita Sriraman",
  "Hasini J",
].map(normalizeName);

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default RESUME_FILES;