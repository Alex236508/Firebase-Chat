const LEET_MAP = {
  "4": "a",
  "@": "a",
  "\u2206": "a",
  "8": "b",
  "\u00df": "b",
  "3": "e",
  "\u20ac": "e",
  "6": "g",
  "9": "g",
  "1": "i",
  "!": "i",
  "|": "i",
  l: "i",
  "0": "o",
  "\u00f8": "o",
  "5": "s",
  $: "s",
  "7": "t",
  "+": "t",
  "2": "z",
  v: "u",
  "\\/": "v",
};

const LEET_REGEX = new RegExp(
  Object.keys(LEET_MAP)
    .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "g",
);

function normalizeUnicode(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function replaceLeet(value) {
  return value.replace(LEET_REGEX, (match) => LEET_MAP[match] || match);
}

function simplifyText(value) {
  return replaceLeet(normalizeUnicode(value.toLowerCase()));
}

function boundedLevenshtein(a, b, threshold) {
  if (a === b) return 0;

  const aLength = a.length;
  const bLength = b.length;

  if (Math.abs(aLength - bLength) > threshold) return threshold + 1;
  if (aLength === 0) return bLength;
  if (bLength === 0) return aLength;

  const previousRow = new Array(bLength + 1);
  const nextRow = new Array(bLength + 1);

  for (let index = 0; index <= bLength; index += 1) {
    previousRow[index] = index;
  }

  for (let row = 0; row < aLength; row += 1) {
    nextRow[0] = row + 1;
    let minCostThisRow = nextRow[0];

    for (let column = 0; column < bLength; column += 1) {
      const cost = a[row] === b[column] ? 0 : 1;
      nextRow[column + 1] = Math.min(
        nextRow[column] + 1,
        previousRow[column + 1] + 1,
        previousRow[column] + cost,
      );
      minCostThisRow = Math.min(minCostThisRow, nextRow[column + 1]);
    }

    if (minCostThisRow > threshold) {
      return threshold + 1;
    }

    for (let index = 0; index <= bLength; index += 1) {
      previousRow[index] = nextRow[index];
    }
  }

  return nextRow[bLength];
}

function compileWord(word) {
  const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleanWord) return null;

  const pattern = [...cleanWord]
    .map((character) => {
      const escaped = character.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      return `${escaped}+`;
    })
    .join("[\\W_]*");

  return {
    raw: word,
    clean: cleanWord,
    regex:
      cleanWord.length < 4
        ? new RegExp(`(^|\\b|\\s|_)${pattern}(?=\\b|\\s|_|$)`, "i")
        : new RegExp(pattern, "i"),
  };
}

export function createProfanityFilter(db) {
  let compiledBlacklist = [];
  let blacklistReady = false;

  const blacklistRef = db.ref("blacklist");
  const handleBlacklistChange = (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      compiledBlacklist = [];
      blacklistReady = true;
      console.warn("Blacklist is empty");
      return;
    }

    compiledBlacklist = Object.keys(data).map(compileWord).filter(Boolean);
    blacklistReady = true;
    console.log(
      "Blacklist loaded & compiled:",
      compiledBlacklist.length,
      "words",
    );
  };

  blacklistRef.on("value", handleBlacklistChange);

  return {
    detect(
      message,
      options = {
        fuzzy: true,
        baseFuzzyThreshold: 1,
        minWordLengthForFuzzy: 4,
      },
    ) {
      if (!message || !blacklistReady || compiledBlacklist.length === 0) {
        return null;
      }

      const simplifiedMessage = simplifyText(message);
      const alphaNumericMessage = simplifiedMessage
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const tokens = alphaNumericMessage.split(/\s+/).filter(Boolean);

      for (const rule of compiledBlacklist) {
        if (rule.regex.test(simplifiedMessage)) {
          return rule.raw;
        }

        if (options.fuzzy && rule.clean.length >= options.minWordLengthForFuzzy) {
          const threshold =
            rule.clean.length >= 6
              ? options.baseFuzzyThreshold + 1
              : options.baseFuzzyThreshold;

          for (const token of tokens) {
            if (Math.abs(token.length - rule.clean.length) <= threshold) {
              if (boundedLevenshtein(token, rule.clean, threshold) <= threshold) {
                return rule.raw;
              }
            }
          }
        }
      }

      return null;
    },
    destroy() {
      blacklistRef.off("value", handleBlacklistChange);
    },
  };
}
