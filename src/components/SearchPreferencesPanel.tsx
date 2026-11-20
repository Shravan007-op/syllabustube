import { useState, KeyboardEvent } from 'react';
import { Plus, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
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
  { value: 'India', label: 'India (Default)' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Global', label: 'Global / All Countries' },
];

const LANGUAGE_OPTIONS: LanguageOption[] = ['English', 'Hindi', 'Marathi', 'Other'];
const VIDEO_COUNT_OPTIONS: VideosPerTopicOption[] = [3, 5, 10];

export function SearchPreferencesPanel({
  preferences,
  onChange,
  onReset,
}: SearchPreferencesPanelProps) {
  const [channelInput, setChannelInput] = useState('');

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
    <section
      id="preferences-section"
      className="border-b border-slate-200 bg-white py-12 sm:py-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#0F1E3D]">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Search & Ranking Preferences</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0B1528]">
              Customise How Videos Are Ranked
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Customise country, language, preferred channels, and ranking for topic-wise YouTube searches.
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B1528] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Controls Grid */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Country, Languages & Video Quota */}
          <div className="lg:col-span-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* 1. Preferred Country */}
              <div>
                <label
                  htmlFor="preferred-country-select"
                  className="block text-sm font-semibold text-[#0B1528]"
                >
                  Preferred Country
                </label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Sets regional curriculum alignment.
                </p>
                <select
                  id="preferred-country-select"
                  value={preferences.preferredCountry}
                  onChange={(e) =>
                    onChange({
                      ...preferences,
                      preferredCountry: e.target.value as CountryOption,
                    })
                  }
                  className="mt-2.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-[#0B1528] focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/20 cursor-pointer"
                >
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Number of Videos Per Topic */}
              <div>
                <span className="block text-sm font-semibold text-[#0B1528]">
                  Videos Per Topic
                </span>
                <p className="mt-0.5 text-xs text-slate-500">
                  Results displayed for each syllabus topic.
                </p>
                <div
                  role="group"
                  aria-label="Number of videos per topic"
                  className="mt-2.5 grid grid-cols-3 rounded-lg bg-slate-100 p-1"
                >
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
                        className={`rounded-md py-2 text-sm font-semibold tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#0F1E3D] text-white shadow-xs'
                            : 'text-slate-600 hover:text-[#0B1528]'
                        }`}
                      >
                        {count} videos
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Language Options */}
            <div>
              <span className="block text-sm font-semibold text-[#0B1528]">
                Preferred Languages
              </span>
              <p className="mt-0.5 text-xs text-slate-500">
                Select one or more lecture languages. Leave all unselected to include every language.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const selected = preferences.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => handleToggleLanguage(lang)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selected
                          ? 'border-[#0F1E3D] bg-[#0F1E3D] text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{lang}</span>
                    </button>
                  );
                })}
              </div>

              {preferences.languages.includes('Other') && (
                <div className="mt-3">
                  <label htmlFor="other-language-input" className="sr-only">
                    Specify other language
                  </label>
                  <input
                    id="other-language-input"
                    type="text"
                    value={preferences.otherLanguageLabel}
                    onChange={(e) =>
                      onChange({
                        ...preferences,
                        otherLanguageLabel: e.target.value,
                      })
                    }
                    placeholder="Specify language (e.g., Tamil, Telugu, Bengali, Kannada)..."
                    className="w-full sm:max-w-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Preferred Channels (Multi) & Ranking/Fallback Toggles */}
          <div className="lg:col-span-6 space-y-6">
            {/* 3 & 4. Optional Preferred YouTube Channel Names (Multiple) */}
            <div>
              <label
                htmlFor="preferred-channel-input"
                className="block text-sm font-semibold text-[#0B1528]"
              >
                Preferred YouTube Channels{' '}
                <span className="font-normal text-slate-500">(Optional, multiple allowed)</span>
              </label>
              <p className="mt-0.5 text-xs text-slate-500">
                Channels listed here are ranked first for every matching syllabus topic.
              </p>

              <div className="mt-2.5 flex gap-2">
                <input
                  id="preferred-channel-input"
                  type="text"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  onKeyDown={handleChannelKeyDown}
                  placeholder="Enter channel name (e.g., Abdul Bari, Gate Smashers)"
                  className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0B1528] placeholder:text-slate-400 focus:border-[#0F1E3D] focus:outline-none focus:ring-2 focus:ring-[#0F1E3D]/20"
                />
                <button
                  type="button"
                  onClick={() => handleAddChannel()}
                  disabled={!channelInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1E3D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#162B54] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Channel</span>
                </button>
              </div>

              {/* Active Added Channels */}
              {preferences.preferredChannels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {preferences.preferredChannels.map((channel) => (
                    <span
                      key={channel}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#0F1E3D]/25 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-[#0B1528]"
                    >
                      <span>{channel}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChannel(channel)}
                        aria-label={`Remove ${channel}`}
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-[#0B1528] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Suggestions */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="mr-1 font-medium text-slate-600">Suggestions:</span>
                {SUGGESTED_INDIAN_CHANNELS.slice(0, 6).map((suggestion) => {
                  const isAdded = preferences.preferredChannels.some(
                    (c) => c.toLowerCase() === suggestion.toLowerCase()
                  );
                  return (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddChannel(suggestion)}
                      className={`rounded-md border px-2 py-1 transition-colors whitespace-nowrap cursor-pointer ${
                        isAdded
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-default'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#0F1E3D] hover:text-[#0F1E3D]'
                      }`}
                    >
                      + {suggestion}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6 & 7. Ranking Priority & Fallback Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.prioritizeIndianChannels}
                  onChange={(e) =>
                    onChange({
                      ...preferences,
                      prioritizeIndianChannels: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F1E3D] focus:ring-[#0F1E3D] accent-[#0F1E3D] cursor-pointer"
                />
                <div>
                  <span className="block text-sm font-semibold text-[#0B1528]">
                    Prioritise Indian Educators
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600 leading-relaxed">
                    Boost Indian university & engineering channels above international results.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 cursor-pointer hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.allowFallbackChannels}
                  onChange={(e) =>
                    onChange({
                      ...preferences,
                      allowFallbackChannels: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0F1E3D] focus:ring-[#0F1E3D] accent-[#0F1E3D] cursor-pointer"
                />
                <div>
                  <span className="block text-sm font-semibold text-[#0B1528]">
                    Allow Fallback Channels
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-600 leading-relaxed">
                    Show global or other-language channels when strict matches are fewer than{' '}
                    <span className="tabular-nums font-medium">{preferences.videosPerTopic}</span>.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
