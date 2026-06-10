/**
 * Spintax — resolve `{option a|option b|option c}` into one random option,
 * supporting nesting. Used to add natural variation to subjects/bodies, which
 * improves deliverability by reducing identical-content fingerprints.
 */
export function spin(input: string): string {
  if (!input || input.indexOf("{") === -1) return input;
  let text = input;
  // Resolve innermost braces first, repeatedly, to support nesting.
  const pattern = /\{([^{}]*)\}/;
  let guard = 0;
  while (pattern.test(text) && guard < 100) {
    text = text.replace(pattern, (_m, group: string) => {
      const options = group.split("|");
      return options[Math.floor(Math.random() * options.length)];
    });
    guard++;
  }
  return text;
}
