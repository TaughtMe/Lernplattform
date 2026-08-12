export type LeitnerLevel = 1 | 2 | 3 | 4 | 5;

export interface Deck {
    id?: number;
    name: string;
    createdAt: number;
    front_lang?: string; // BCP 47 code
    back_lang?: string;  // BCP 47 code
    metadata?: Record<string, any>;
}

export interface Card {
    id?: number;
    deckId: number;
    question: string;
    answer: string;
    level: LeitnerLevel;
    nextReview: number;
    lastReviewed?: number; // New field for Decay logic
    createdAt: number;
    // Future proofing
    writingStreak?: number;
    imageUrl?: string;
    audioUrl?: string;
    tag?: string;

    // standard Leitner (Explicit Box/Interval for clarity)
    box?: number; // 1-5, synced with level usually
    interval?: number; // days

    // Reverse Learning
    reverseBox?: number;
    reverseInterval?: number;
    reverseNextReview?: number;
    reverseWritingStreak?: number;

    // Extension Point (Strictly typed as Record<string, any> for flexibility)
    // Only use for data that doesn't fit into the main schema (e.g., plugin data)
    metadata?: Record<string, any>;
}
