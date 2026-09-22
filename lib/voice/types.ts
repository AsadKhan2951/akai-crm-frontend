export type VoiceDraft = {
  customerId: string | null;
  activityType: "CALL" | "WHATSAPP" | "EMAIL" | "VISIT" | "NOTE" | "MEETING" | null;
  disposition: "CONNECTED" | "NO_ANSWER" | "BUSY" | "WRONG_NUMBER" | "CALLBACK_REQUESTED" | "NOT_INTERESTED" | "INTERESTED" | "ORDER_PLACED" | "QUOTE_REQUESTED" | "FOLLOW_UP_SCHEDULED" | "COMPLAINT" | "PAYMENT_COLLECTED" | null;
  keyPoints: string[];
  commitment: string | null;
  followUpDate: string | null;
  followUpNote: string | null;
  notes: string;
  confidence: "high" | "medium" | "low";
  needsConfirmation: true;
};

export type VoiceProcessingResult = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED";
  transcript: string | null;
  transcriptLanguage: string | null;
  structuredOutput: VoiceDraft | null;
  error: string | null;
};

export function emptyVoiceDraft(transcript = ""): VoiceDraft {
  return {
    customerId: null,
    activityType: null,
    disposition: null,
    keyPoints: [],
    commitment: null,
    followUpDate: null,
    followUpNote: null,
    notes: transcript,
    confidence: "low",
    needsConfirmation: true,
  };
}

export function isVoiceDraft(value: unknown): value is VoiceDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<VoiceDraft>;
  return draft.needsConfirmation === true && Array.isArray(draft.keyPoints) && typeof draft.notes === "string";
}
