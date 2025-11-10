import type { VoiceCommandDefinition } from "@saycast/types";

const normalize = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface MatchResult {
  command: VoiceCommandDefinition;
  score: number;
}

export class CommandMatcher {
  private commands: VoiceCommandDefinition[];

  constructor(commands: VoiceCommandDefinition[]) {
    this.commands = commands;
  }

  update(commands: VoiceCommandDefinition[]) {
    this.commands = commands;
  }

  match(utterance: string): MatchResult | null {
    const normalizedUtterance = normalize(utterance);
    if (!normalizedUtterance) {
      return null;
    }

    let top: MatchResult | null = null;

    for (const command of this.commands) {
      for (const phrase of command.phrases) {
        const normalizedPhrase = normalize(phrase);
        const score = this.computeScore(normalizedUtterance, normalizedPhrase);
        if (!top || score > top.score) {
          top = { command, score };
        }
      }
    }

    if (!top || top.score < 0.35) {
      return null;
    }

    return top;
  }

  private computeScore(utterance: string, phrase: string): number {
    if (utterance === phrase) {
      return 1;
    }

    if (utterance.includes(phrase) || phrase.includes(utterance)) {
      return 0.85;
    }

    const utteranceTokens = new Set(utterance.split(" "));
    const phraseTokens = new Set(phrase.split(" "));
    const shared = [...utteranceTokens].filter((token) => phraseTokens.has(token));
    const jaccard = shared.length / new Set([...utteranceTokens, ...phraseTokens]).size;
    return jaccard;
  }
}
