import { Textarea } from "@/components/ui/textarea";

const TranscriptionDisplay = ({ transcript }: { transcript: string }) => {
  return (
    <Textarea
      value={transcript}
      readOnly
      placeholder="Transcription will appear here..."
      className="w-full h-32"
    />
  );
};

export default TranscriptionDisplay;