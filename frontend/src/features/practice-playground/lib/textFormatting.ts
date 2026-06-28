const sentenceStartPattern = /(^|[.!?]\s+)(["'([{]*)(\p{L})/gu;

const isUppercaseLetter = (value: string): boolean =>
  value !== value.toLocaleLowerCase() && value === value.toLocaleUpperCase();

const startsCaseSensitiveToken = (value: string, letterIndex: number): boolean => {
  const nextCharacter = value.charAt(letterIndex + 1);

  return /\d/.test(nextCharacter) || isUppercaseLetter(nextCharacter);
};

export const formatSentenceCase = (value: string): string => {
  const trimmedValue = value.trim();

  return trimmedValue.replace(
    sentenceStartPattern,
    (
      match: string,
      prefix: string,
      wrapper: string,
      letter: string,
      offset: number,
    ) => {
      const letterIndex = offset + prefix.length + wrapper.length;

      if (startsCaseSensitiveToken(trimmedValue, letterIndex)) {
        return match;
      }

      return `${prefix}${wrapper}${letter.toLocaleUpperCase()}`;
    },
  );
};
