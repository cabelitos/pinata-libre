const emojiRegExp = /(:[\w-]+:)/gi;
const peopleRegex = /<@(.+?)>/g;

export const getMentionedPeople = (text: string): RegExpMatchArray[] =>
  Array.from(text.matchAll(peopleRegex) ?? []);

export const getEmojisMatch = (text: string): RegExpMatchArray | null =>
  text.match(emojiRegExp);
