'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Send,
  ShieldAlert,
  Sparkles,
  User as UserIcon
} from 'lucide-react';
import type {
  CalorieCalculationResult,
  ProfileRow,
  UserPreferencesRow
} from '@/types/domain';
import { ErrorBanner } from '@/components/ui/Primitives';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  referencedFoods?: Array<{
    name: string;
    source: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    servingSizeG?: number;
    servingCalories?: number;
  }>;
}

interface AiCoachClientProps {
  llmConfigured: boolean;
  llmModel: string;
  profile: ProfileRow | null;
  preferences: UserPreferencesRow | null;
  targets: CalorieCalculationResult | null;
}

const STARTER_PROMPTS = [
  'Explain my calculated BMR, TDEE, and daily macro targets.',
  'Suggest 3 budget-friendly high-protein Indian meals matching my diet & allergies.',
  'How do I apply progressive overload safely without training through joint pain?',
  'Why did my scale weight jump 0.8 kg overnight and how should I read moving averages?'
];

export function AiCoachClient({
  llmConfigured,
  llmModel,
  profile,
  preferences,
  targets
}: AiCoachClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || sending) return;
    setError(null);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'AI Coach could not complete the request.');
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: json.reply,
        referencedFoods: json.referencedFoods
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI Coach.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
          AI Fitness &amp; Nutrition Coach
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Grounded in your deterministic Mifflin–St Jeor targets, verified USDA/IFCT food
          records, and logged Supabase summaries.
        </p>
      </div>

      {!llmConfigured && (
        <div
          role="region"
          aria-label="AI Coach Configuration Notice"
          className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="font-bold">
              External LLM Provider Not Configured Yet (<code className="font-mono">LLM_API_KEY</code>)
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Add <code className="font-mono font-semibold">LLM_API_KEY</code> and{' '}
              <code className="font-mono font-semibold">LLM_MODEL</code> (plus optional{' '}
              <code className="font-mono font-semibold">LLM_BASE_URL</code>) to{' '}
              <code className="font-mono font-semibold">.env.local</code> on the server to
              activate live conversational responses. All deterministic calculators, meal
              planners, food tracking, and workout generators continue operating normally.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Authorized Context Brief */}
        <aside className="lg:col-span-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5 space-y-4 self-start">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-crimson-500">
              Deterministic Grounding
            </span>
            <span className="text-[11px] font-mono text-zinc-500">{llmModel}</span>
          </div>

          {targets && profile ? (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-zinc-50 dark:bg-obsidian-950 p-3 border border-zinc-200 dark:border-zinc-800 space-y-1 tabular-nums">
                <p className="font-bold text-zinc-900 dark:text-white">
                  Calculated Energy Targets
                </p>
                <p>BMR: {targets.bmr} kcal/day</p>
                <p>Maintenance (TDEE): {targets.tdee} kcal/day</p>
                <p className="text-crimson-500 font-bold">
                  Daily Target: {targets.targetCalories} kcal/day
                </p>
                <p>
                  Macros: P {targets.macros.proteinG}g &bull; C {targets.macros.carbsG}g
                  &bull; F {targets.macros.fatG}g &bull; Fib {targets.macros.fiberG}g
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 dark:bg-obsidian-950 p-3 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <p className="font-bold text-zinc-900 dark:text-white">
                  Diet &amp; Training Context
                </p>
                <p className="capitalize">Diet: {profile.dietary_preference}</p>
                <p>
                  Allergies:{' '}
                  {preferences?.allergies?.length
                    ? preferences.allergies.join(', ')
                    : 'None'}
                </p>
                <p className="capitalize">
                  Training: {preferences?.training_experience ?? 'beginner'} (
                  {preferences?.workout_days_per_week ?? 4}d/wk)
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Complete onboarding so AI Coach can reference your exact calculated BMR, TDEE,
              and dietary preferences.
            </p>
          )}

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-[11px] text-zinc-500 space-y-1.5">
            <p className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
              <ShieldAlert className="h-3.5 w-3.5 text-crimson-500" />
              Safety &amp; Source Distinction
            </p>
            <p>
              AI Coach never diagnoses medical conditions, prescribes medications, or
              recommends unsafe supplements, and never accesses any other user&apos;s data.
            </p>
          </div>
        </aside>

        {/* Chat Interface */}
        <section className="lg:col-span-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 flex flex-col min-h-[520px]">
          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[520px]">
            {messages.length === 0 ? (
              <div className="space-y-4 py-6">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                  <Sparkles className="h-4 w-4 text-crimson-500" />
                  <span>Ask TitanFit AI Coach</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTER_PROMPTS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => void sendMessage(sp)}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 p-3.5 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:border-crimson-500 transition-colors"
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-crimson-600 text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-crimson-600 text-white'
                        : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    <p>{msg.content}</p>
                    {msg.referencedFoods && msg.referencedFoods.length > 0 && (
                      <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-2.5 text-[11px] text-zinc-500 space-y-1">
                        <p className="font-semibold text-emerald-500 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified Food Records Supplied to Model:
                        </p>
                        {msg.referencedFoods.map((rf, idx) => (
                          <p key={idx}>
                            &bull; {rf.name} ({rf.source}):{' '}
                            {rf.servingCalories ?? rf.caloriesPer100g} kcal per{' '}
                            {rf.servingSizeG ?? 100}g serving, {rf.caloriesPer100g} kcal/100g,{' '}
                            {rf.proteinPer100g}g protein/100g
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {sending && (
              <div className="text-xs text-zinc-500 animate-pulse">
                AI Coach is analyzing your calculated targets and verified food data...
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
            <ErrorBanner message={error} />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                maxLength={2000}
                placeholder="Ask about macros, affordable Indian meals, form cues, or recovery..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message to AI Coach"
                className="inline-flex items-center gap-2 rounded-xl bg-crimson-600 px-5 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
