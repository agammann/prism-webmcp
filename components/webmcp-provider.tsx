'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { ProfileKey } from '@/lib/evaluator';

export type WebMCPActivity = {
  id: string; tool: string; title: string; mode: 'read' | 'write'; status: 'completed' | 'failed'; timestamp: string;
};
type Props = {
  context: Record<string, unknown>;
  report: Record<string, unknown>;
  onChooseProfile: (profile: ProfileKey) => void;
  onRunSample: (profile: ProfileKey) => unknown;
  onRunCurrent: () => unknown;
  onActivity: (activity: WebMCPActivity) => void;
  onStatus: (status: string) => void;
};
function objectInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input must be an object.');
  return input as Record<string, unknown>;
}
function noInput(input: unknown) {
  if (Object.keys(objectInput(input)).length) throw new Error('This tool takes no properties.');
}
function profileInput(input: unknown): ProfileKey {
  const data = objectInput(input);
  if (Object.keys(data).some(key => key !== 'profile')) throw new Error('Only profile is accepted.');
  const value = data.profile;
  if (value !== 'commerce' && value !== 'operations' && value !== 'editor' && value !== 'custom') throw new Error('profile must be commerce, operations, editor, or custom.');
  return value;
}
const emptySchema = { type: 'object', properties: {}, additionalProperties: false };
const profileSchema = { type: 'object', properties: { profile: { type: 'string', enum: ['commerce', 'operations', 'editor', 'custom'], description: 'Choose a built-in contract, or custom to use the custom fields currently entered.' } }, required: ['profile'], additionalProperties: false };

export function WebMCPProvider(props: Props) {
  const latest = useRef(props);
  useLayoutEffect(() => { latest.current = props; });
  useEffect(() => {
    const context = document.modelContext;
    if (typeof context?.registerTool !== 'function') {
      latest.current.onStatus('Manual mode: this browser does not expose document.modelContext. All dashboard controls remain available.');
      return;
    }
    let lifecycle = new AbortController();
    const tools: WebMCPTool[] = [
      {
        name: 'get_evaluation_context', title: 'Get evaluation context',
        description: 'Read the current draft profile, actual custom intent and tool names, approval rule, target label, and source selection shown in Prism.',
        inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: input => { noInput(input); return latest.current.context; },
      },
      {
        name: 'choose_evaluation_profile', title: 'Choose evaluation profile',
        description: 'Change the visible draft contract. Preserve imported JSON and the previous report; that report is marked stale until evaluated again.',
        inputSchema: profileSchema, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: input => {
          const profile = profileInput(input);
          flushSync(() => latest.current.onChooseProfile(profile));
          return latest.current.context;
        },
      },
      {
        name: 'run_sample_evaluation', title: 'Run sample evaluation',
        description: 'Evaluate a built-in synthetic example against the requested contract and visibly mark it as an example. Custom uses the current custom fields; this never tests a live target.',
        inputSchema: profileSchema, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: input => {
          const profile = profileInput(input);
          let result: unknown;
          flushSync(() => { result = latest.current.onRunSample(profile); });
          return result;
        },
      },
      {
        name: 'evaluate_current_snapshot', title: 'Evaluate current snapshot',
        description: 'Evaluate the JSON currently entered in Runner snapshot against the visible contract and update the report. Requires Runner snapshot mode. Evidence is supplied, not independently verified.',
        inputSchema: emptySchema, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: input => {
          noInput(input);
          if (latest.current.context.source !== 'snapshot') throw new Error('Select Runner snapshot and supply JSON first.');
          let result: unknown;
          flushSync(() => { result = latest.current.onRunCurrent(); });
          return result;
        },
      },
      {
        name: 'get_latest_evaluation', title: 'Get latest evaluation',
        description: 'Read the visible report including its exact contract, target, example or snapshot provenance, findings, and stale flag. A stale report does not describe the current draft.',
        inputSchema: emptySchema, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: input => { noInput(input); return latest.current.report; },
      },
    ];
    const register = async () => {
      const registration = lifecycle;
      try {
        for (const tool of tools) {
          if (registration.signal.aborted) return;
          await context.registerTool({ ...tool, execute: async input => {
            if (registration.signal.aborted) throw new Error('This evaluation is no longer active.');
            const timestamp = new Date().toISOString();
            const activity = { id: `${timestamp}-${crypto.randomUUID()}`, tool: tool.name, title: tool.title || tool.name, mode: tool.annotations?.readOnlyHint === true ? 'read' as const : 'write' as const, timestamp };
            try {
              const result = await tool.execute(input);
              if (!registration.signal.aborted) latest.current.onActivity({ ...activity, status: 'completed' });
              return result;
            } catch (error) {
              if (!registration.signal.aborted) latest.current.onActivity({ ...activity, status: 'failed' });
              throw error;
            }
          } }, { signal: registration.signal });
        }
        if (!registration.signal.aborted) latest.current.onStatus('WebMCP ready: five tools connected to the visible evaluation.');
      } catch {
        if (registration.signal.aborted) return;
        registration.abort();
        latest.current.onStatus('WebMCP registration failed. Use the dashboard controls or reload to retry.');
      }
    };
    const suspend = () => lifecycle.abort();
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      lifecycle = new AbortController();
      void register();
    };
    window.addEventListener('pagehide', suspend);
    window.addEventListener('pageshow', restore);
    void register();
    return () => {
      window.removeEventListener('pagehide', suspend);
      window.removeEventListener('pageshow', restore);
      lifecycle.abort();
    };
  }, []);
  return null;
}
