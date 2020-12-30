import { WebClient } from '@slack/web-api';

const emojiRegExp = /(:['\w-+]+:)/gi;
const peopleRegex = /<@(?<user>.+?)>|<!subteam\^(?<subteam>.+?)>/g;

interface GroupData {
  users: string[];
}

export const getMentionedPeople = async (
  text: string,
  botToken?: string | undefined,
): Promise<string[]> => {
  const client = new WebClient(botToken);
  const userIds = await Promise.all(
    Array.from(text.matchAll(peopleRegex)).map(
      async (match): Promise<string | string[]> => {
        const matchData = match[1];
        if (match.groups?.subteam) {
          const groupData = ((await client.usergroups.users.list({
            usergroup: matchData,
          })) as unknown) as GroupData;
          return groupData.users;
        }
        return matchData;
      },
    ),
  );
  return userIds.flat();
};

export const getEmojisMatch = (text: string): RegExpMatchArray | null =>
  text.match(emojiRegExp);
