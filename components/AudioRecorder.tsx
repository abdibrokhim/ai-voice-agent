"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

// Declare SpeechRecognition type for TypeScript compatibility
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const AudioRecorder = ({ onTranscript }: { onTranscript: (text: string) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize SpeechRecognition on component mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true; // Keep listening until stopped
      recog.interimResults = true; // Show real-time results
      recog.lang = "en-US"; // Set language (customizable)

      // Handle transcription results
      recog.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        onTranscript(transcript); // Send transcript to parent
      };

      // Log errors (e.g., no speech, mic access denied)
      recog.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
      };

      setRecognition(recog);
    } else {
      console.error("Speech recognition not supported in this browser.");
    }
  }, [onTranscript]);

  // Start recording
  const startRecording = () => {
    if (recognition) {
      recognition.start();
      setIsRecording(true);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  return (
    <div>
      <Button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </Button>
    </div>
  );
};

export default AudioRecorder;