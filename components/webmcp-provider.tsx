'use client';

import { useEffect } from 'react';

import {
  evaluateSnapshot,
  getSampleSnapshot,
  profiles,
  type EvaluationReport,
  type ProfileKey,
} from '@/lib/evaluator';

type Props = {
  profile: ProfileKey;
  targetUrl: string;
  report: EvaluationReport;
  onChooseProfile: (profile: ProfileKey) => void;
  onRun: (profile: ProfileKey, report: EvaluationReport) => void;
};

function objectInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input must be an object.');
  return input as Record<string, unknown>;
}

function profileInput(input: unknown): ProfileKey {
  const value = objectInput(input).profile;
  if (value !== 'commerce' && value !== 'operations' && value !== 'editor' && value !== 'custom') {
    throw new Error('profile must be commerce, operations, editor, or custom.');
  }
  return value;
}

export function WebMCPProvider({ profile, targetUrl, report, onChooseProfile, onRun }: Props) {
  useEffect(() => {
    const context = document.modelContext;
    if (typeof context?.registerTool !== 'function') return;
    const lifecycle = new AbortController();
    const register = (tool: WebMCPTool) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(console.error);
      } catch (error) {
        console.error(error);
      }
    };

    register({
      name: 'get_evaluation_context',
      title: 'Get evaluation context',
      description: 'Read the currently selected WebMCP purpose profile, target label, expected capabilities, and human approval rule shown in Prism.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async (input) => {
        if (Object.keys(objectInput(input)).length) throw new Error('This tool takes no properties.');
        return {
          profile,
          targetUrl,
          intent: profiles[profile].intent,
          expectedCapabilities: profiles[profile].capabilities.map((capability) => capability.candidates[0]),
          approvalRule: profiles[profile].approvalRule,
        };
      },
    });

    register({
      name: 'choose_evaluation_profile',
      title: 'Choose evaluation profile',
      description: 'Select which declared WebMCP job Prism should evaluate. This changes the visible profile, intent, capability map, and sample scorecard.',
      inputSchema: {
        type: 'object',
        properties: { profile: { type: 'string', enum: ['commerce', 'operations', 'editor', 'custom'] } },
        required: ['profile'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const nextProfile = profileInput(input);
        onChooseProfile(nextProfile);
        return { selectedProfile: nextProfile, visibleStateChanged: true, intent: profiles[nextProfile].intent };
      },
    });

    register({
      name: 'run_sample_evaluation',
      title: 'Run sample evaluation',
      description: 'Run a deterministic example WebMCP evaluation for the selected purpose profile and update the visible report with its evidence-backed score.',
      inputSchema: {
        type: 'object',
        properties: { profile: { type: 'string', enum: ['commerce', 'operations', 'editor', 'custom'] } },
        required: ['profile'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const nextProfile = profileInput(input);
        const nextReport = evaluateSnapshot(profiles[nextProfile], getSampleSnapshot(nextProfile));
        onRun(nextProfile, nextReport);
        return { selectedProfile: nextProfile, score: nextReport.score, label: nextReport.label, visibleStateChanged: true };
      },
    });

    register({
      name: 'get_latest_evaluation',
      title: 'Get latest evaluation',
      description: 'Read the score, summary, journey coverage, and evidence findings currently visible in Prism.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async (input) => {
        if (Object.keys(objectInput(input)).length) throw new Error('This tool takes no properties.');
        return {
          score: report.score,
          label: report.label,
          summary: report.summary,
          journey: report.journey,
          findings: report.findings,
        };
      },
    });

    return () => lifecycle.abort();
  }, [onChooseProfile, onRun, profile, report, targetUrl]);

  return null;
}

