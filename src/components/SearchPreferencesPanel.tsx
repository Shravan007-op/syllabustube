import { useState, KeyboardEvent } from 'react';
import { Plus, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import {
  CountryOption,
  LanguageOption,
  SearchPreferences,
  VideosPerTopicOption,
} from '../types/syllabus';
import { SUGGESTED_INDIAN_CHANNELS } from '../data/sampleSyllabi';

interface SearchPreferencesPanelProps {
  preferences: SearchPreferences;
  onChange: (next: SearchPreferences) => void;
  onReset: () => void;
}

const COUNTRY_OPTIONS: { value: CountryOption; label: string }[] = [
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Global', label: 'Global / All Regions' },
];

const LANGUAGE_OPTIONS: LanguageOption[] = ['English', 'Hindi', 'Marathi', 'Other'];
const VIDEO_COUNT_OPTIONS: VideosPerTopicOption[] = [3, 5, 10];

export function SearchPreferencesPanel({
  preferences,
  onChange,
  onReset,
}: SearchPreferencesPanelProps) {
  const [channelInput, setChannelInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleLanguage = (lang: LanguageOption) => {
    const exists = preferences.languages.includes(lang);
    const nextLanguages = exists
      ? preferences.languages.filter((l) => l !== lang)
      : [...preferences.languages, lang];

    onChange({
      ...preferences,
      languages: nextLanguages,
    });
  };

  const handleAddChannel = (rawName?: string) => {
    const candidate = (rawName ?? channelInput).trim();
    if (!candidate) return;

    const alreadyAdded = preferences.preferredChannels.some(
      (c) => c.toLowerCase() === candidate.toLowerCase()
    );
    if (!alreadyAdded) {
      onChange({
        ...preferences,
        preferredChannels: [...preferences.preferredChannels, candidate],
      });
    }

    if (!rawName) {
      setChannelInput('');
    }
  };

  const handleChannelKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddChannel();
    }
  };

  const handleRemoveChannel = (channelToRemove: string) => {
    onChange({
      ...preferences,
      preferredChannels: preferences.preferredChannels.filter((c) => c !== channelToRemove),
    });
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-muted/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          <span className="text-xs font-semibold text-text-main">Search Preferences</span>
          <span className="text-xs text-text-muted">
            ({preferences.preferredCountry} · {preferences.languages.join(', ') || 'All languages'} · {preferences.videosPerTopic} videos/topic)
          </span>
        </div>

        <span className="text-xs text-accent font-medium">
          {isOpen ? 'Collapse' : 'Configure'}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-border-subtle space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Country */}
            <div className="space-y-1.5">
              <label htmlFor="country-select" className="text-xs font-medium text-text-main block">
                Region
              </label>
              <select
                id="country-select"
                value={preferences.preferredCountry}
                onChange={(e) =>
                  onChange({
                    ...preferences,
                    preferredCountry: e.target.value as CountryOption,
                  })
                }
                className="w-full rounded-md border border-border-subtle bg-surface p-2 text-xs text-text-main focus:border-accent focus:outline-none cursor-pointer"
              >
                {COUNTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Videos Per Topic */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-text-main block">
                Videos Per Topic
              </span>
              <div role="group" aria-label="Videos per topic" className="flex rounded-md border border-border-subtle p-0.5 bg-surface-muted/50">
                {VIDEO_COUNT_OPTIONS.map((count) => {
                  const active = preferences.videosPerTopic === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...preferences,
                          videosPerTopic: count,
                        })
                      }
                      className={`flex-1 rounded py-1 text-xs font-medium transition-colors font-mono tabular-nums cursor-pointer ${
                        active
                          ? 'bg-surface text-text-main shadow-xs'
                          : 'text-text-muted hover:text-text-main'
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-medium text-text-main block">
                Lecture Languages
              </span>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const selected = preferences.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleToggleLanguage(lang)}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer border ${
                        selected
                          ? 'border-accent bg-accent text-white'
                          : 'border-border-subtle bg-surface text-text-muted hover:border-border-strong'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preferred Channels */}
          <div className="space-y-2 pt-2 border-t border-border-subtle">
            <label htmlFor="pref-channel-input" className="text-xs font-medium text-text-main block">
              Prioritize Specific Channels (Optional)
            </label>

            <div className="flex gap-2 max-w-md">
              <input
                id="pref-channel-input"
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                onKeyDown={handleChannelKeyDown}
                placeholder="e.g., Gate Smashers, Abdul Bari"
                className="flex-1 rounded-md border border-border-subtle bg-surface px-3 py-1.5 text-xs text-text-main focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddChannel()}
                disabled={!channelInput.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-surface border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-main hover:border-border-strong disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Add</span>
              </button>
            </div>

            {preferences.preferredChannels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preferences.preferredChannels.map((channel) => (
                  <span
                    key={channel}
                    className="inline-flex items-center gap-1 rounded bg-surface-muted border border-border-subtle px-2 py-0.5 text-xs text-text-main"
                  >
                    <span>{channel}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChannel(channel)}
                      aria-label={`Remove ${channel}`}
                      className="rounded p-0.5 text-text-muted hover:text-error-text cursor-pointer"
                    >
                      <X className="h-3 w-3" strokeWidth={1.75} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reset Action */}
          <div className="flex justify-end pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
