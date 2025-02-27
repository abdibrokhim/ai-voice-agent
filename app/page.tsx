'use client';

import React, { useEffect, useState } from 'react';
import AudioRecorder from '@/components/AudioRecorder';
import TranscriptionDisplay from '@/components/TranscriptionDisplay';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { loader } from '@/lib/loader';
import { saveAndPlayAudio } from '@/lib/indexedDb';

const Page = () => {
  const indexName = 'exampleindex';
  const [urls, setUrls] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('Idle');
  const [isScraping, setScraping] = useState(false);
  const [isUpserting, setUpserting] = useState(false);
  const [isQuerying, setQuerying] = useState(false);
  const [query, setQuery] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');

  // controller
  useEffect(() => {
    // change status
    setStatus('Ready to ask questions');
  }, []);

  const handleScrape = async () => {
    console.log('Scraping and Upserting');

    setStatus('Scraping content');
    setScraping(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      if (!response.ok) {
        throw new Error('Scraping failed');
      }
      const data = await response.json();
      console.log('Scrape response:', data);

      const directory = data.directory;
      const files = data.files;
      const skippedFiles = data.skippedFiles;
      console.log('Scraped directory:', directory);
      console.log('Scraped files:', files);
      console.log('Skipped files:', skippedFiles);

      return { directory, files, skippedFiles };
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      console.log('Scraping completed');

      setScraping(false);
    }
  };

  const handleUpsert = async (filePath: string, indexName: string ) => {
    console.log('Upserting content');

    setStatus('Upserting content');
    setUpserting(true);
    try {
      const response = await fetch('/api/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, indexName }),
      });
      if (!response.ok) {
        throw new Error('Upserting failed');
      }
      const data = await response.json();
      console.log('Embed response:', data);
      console.log('Stats: ', data.stats);
      setStatus('Ready to ask questions');
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      console.log('Upserting completed');

      setUpserting(false);
    }
  };

  // control over process and upsert
  const handleProcess = async () => {
    console.log('Processing... ');

    // Scrape
    const { directory, files } : any = await handleScrape();
    if (!directory || !files) return;

    // Upsert
    const filePaths = files.map((file: string) => `${directory}/${file}`);
    for (const filePath of filePaths) {
      await handleUpsert(filePath, indexName);
    }
  };

  // Convert text to speech
  const textToSpeech = async (text: string) => {
    console.log('Converting text to speech...');
    try {
      const response = await fetch('/api/text2speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const blob = await response.blob();

      await saveAndPlayAudio(blob);
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while fetching the audio.');
    } finally {
      console.log('Text to speech completed');
    }
  };

  const handleSendQuery = async () => {
    console.log('Sending query');

    if (!query) return;
    setStatus('Processing query');
    console.log('Processing Query:', query);
    setQuerying(true);
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, indexName }),
      });
      if (!response.ok) {
        throw new Error('Query failed');
      }
      const data = await response.json();
      console.log('Query response:', data);
      setAnswer(data.answer); // Markdown format
      setStatus('Answer generated');
      return data.answer;
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      console.log('Query completed');

      setQuerying(false);
    }
  };

  const cleanUpAgentAnswer = (answer: string) => {
    // Remove markdown formatting
    return answer.replace(/[#*`]/g, '');
  };

  const handleConvo = async () => {
    console.log('Starting conversation');

    // Send a query
    const r = await handleSendQuery();

    // Convert text to speech
    if (r) {
      const cleanAnswer = cleanUpAgentAnswer(r);
      await textToSpeech(cleanAnswer);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <section className="w-full max-w-2xl">
          <Label htmlFor="urls">Enter URLs (one per line):</Label>
          <Textarea
            id="urls"
            value={urls.join('\n')}
            onChange={e => setUrls(e.target.value.split('\n').filter(url => url.trim()))}
            disabled={isScraping || isUpserting}
            className="mt-2"
          />
          <Button
            disabled={isScraping || isUpserting || urls.length === 0}
            onClick={handleProcess}
            className="mt-4"
          >
            {isScraping ? loader() : 'Proceed'}
          </Button>
        </section>
        <section className="w-full max-w-2xl">
          <p className="text-lg font-semibold">{status}</p>
        </section>
        {status === 'Ready to ask questions' && (
          <>
            {/* // Query by voice */}
            <section className="w-full max-w-2xl">
              <AudioRecorder onTranscript={setQuery} />
              <TranscriptionDisplay transcript={query} />
              <Button
                disabled={isQuerying || !query}
                onClick={handleConvo}
                className="mt-4"
              >
                {isQuerying ? loader() : 'Send Query'}
              </Button>
            </section>
            {/* // Query manual input */}
            <section className="w-full max-w-2xl">
              <Label htmlFor="query">Enter your query:</Label>
              <Textarea
                id="query"
                value={query}
                onChange={e => setQuery(e.target.value)}
                disabled={isQuerying}
                className="mt-2"
              />
              <Button
                disabled={isQuerying || !query}
                onClick={handleConvo}
                className="mt-4"
              >
                {isQuerying ? loader() : 'Send Query'}
              </Button>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Page;