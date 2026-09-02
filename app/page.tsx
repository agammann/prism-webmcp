'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  CircleAlert,
  CircleDot,
  ClipboardPaste,
  Code2,
  FlaskConical,
  Gauge,
  Layers3,
  MonitorDot,
  Play,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';

import { WebMCPProvider } from '@/components/webmcp-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  evaluateSnapshot,
  getSampleSnapshot,
  makeCustomProfile,
  parseSnapshot,
  profiles,
  type EvaluationProfile,
  type EvaluationReport,
  type ProfileKey,
} from '@/lib/evaluator';

type SourceMode = 'sample' | 'snapshot';

const sampleTargets: Record<ProfileKey, string> = {
  commerce: 'https://shop.example',
  operations: 'https://workspace.example',
  editor: 'https://editor.example',
  custom: 'https://your-site.example',
};

function findingIcon(state: 'pass' | 'warn' | 'fail') {
  return state === 'pass' ? <Check className="size-3.5" /> : <CircleAlert className="size-3.5" />;
}

function findingTone(state: 'pass' | 'warn' | 'fail') {
  if (state === 'pass') return 'bg-emerald-100 text-emerald-700';
  if (state === 'warn') return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function decodeSnapshotFragment(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Home() {
  const [profile, setProfile] = useState<ProfileKey>('commerce');
  const [targetUrl, setTargetUrl] = useState(sampleTargets.commerce);
  const [sourceMode, setSourceMode] = useState<SourceMode>('sample');
  const [snapshotText, setSnapshotText] = useState(() => JSON.stringify(getSampleSnapshot('commerce'), null, 2));
  const [customIntent, setCustomIntent] = useState(profiles.custom.intent);
  const [customTools, setCustomTools] = useState('your_read_tool, your_write_tool');
  const [customApproval, setCustomApproval] = useState(profiles.custom.approvalRule);
  const [error, setError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);
  const [report, setReport] = useState<EvaluationReport>(() => evaluateSnapshot(profiles.commerce, getSampleSnapshot('commerce')));

  const evaluationProfile: EvaluationProfile = useMemo(
    () => profile === 'custom' ? makeCustomProfile(customIntent, customTools, customApproval) : profiles[profile],
    [customApproval, customIntent, customTools, profile],
  );

  useEffect(() => {
    const prefix = ['#prism-snapshot=', '#lens-snapshot='].find((candidate) => window.location.hash.startsWith(candidate));
    if (!prefix) return;
    queueMicrotask(() => {
      try {
        const raw = decodeSnapshotFragment(window.location.hash.slice(prefix.length));
        const imported = parseSnapshot(raw);
        const nextProfile = imported.profile && Object.hasOwn(profiles, imported.profile) ? imported.profile : 'custom';
        const importedIntent = imported.contract?.intent?.trim() || profiles[nextProfile].intent;
        const importedTools = imported.contract?.expectedTools?.join(', ') || imported.tools.map((tool) => tool.name).join(', ');
        const importedApproval = imported.contract?.approvalRule?.trim() || profiles[nextProfile].approvalRule;
        const nextEvaluationProfile = nextProfile === 'custom'
          ? makeCustomProfile(importedIntent, importedTools, importedApproval)
          : profiles[nextProfile];

        setProfile(nextProfile);
        setTargetUrl(imported.target || sampleTargets[nextProfile]);
        setSourceMode('snapshot');
        setSnapshotText(JSON.stringify(imported, null, 2));
        setCustomIntent(importedIntent);
        setCustomTools(importedTools);
        setCustomApproval(importedApproval);
        setReport(evaluateSnapshot(nextEvaluationProfile, imported));
        setScanned(true);
        setImportNotice(`Imported a live companion snapshot with ${imported.tools.length} tool${imported.tools.length === 1 ? '' : 's'}.`);
        setError(null);
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#report`);
      } catch (reason) {
        setError(reason instanceof Error ? `Companion import failed: ${reason.message}` : 'Companion import failed.');
      }
    });
  }, []);

  const chooseProfile = useCallback((nextProfile: ProfileKey) => {
    const nextSnapshot = getSampleSnapshot(nextProfile);
    setProfile(nextProfile);
    setTargetUrl(sampleTargets[nextProfile]);
    setSnapshotText(JSON.stringify(nextSnapshot, null, 2));
    setReport(evaluateSnapshot(profiles[nextProfile], nextSnapshot));
    setScanned(false);
    setImportNotice(null);
    setError(null);
  }, []);

  const runEvaluation = useCallback(() => {
    try {
      const snapshot = sourceMode === 'sample' ? getSampleSnapshot(profile) : parseSnapshot(snapshotText);
      const nextReport = evaluateSnapshot(evaluationProfile, snapshot);
      setReport(nextReport);
      setScanned(true);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The snapshot could not be evaluated.');
    }
  }, [evaluationProfile, profile, snapshotText, sourceMode]);

  const handleWebMCPRun = useCallback((nextProfile: ProfileKey, nextReport: EvaluationReport) => {
    setProfile(nextProfile);
    setTargetUrl(sampleTargets[nextProfile]);
    setReport(nextReport);
    setScanned(true);
    setError(null);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <WebMCPProvider
        profile={profile}
        targetUrl={targetUrl}
        report={report}
        onChooseProfile={chooseProfile}
        onRun={handleWebMCPRun}
      />

      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#09110f]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-md border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
              <ScanSearch className="size-4" />
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-semibold tracking-[-0.03em] text-white">Prism</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200/55 sm:inline">purpose-aware evals</span>
            </span>
          </a>
          <nav className="flex items-center gap-1" aria-label="Primary navigation">
            <a href="#profiles" className="hidden rounded-md px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white sm:inline-flex">Profiles</a>
            <a href="#method" className="hidden rounded-md px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white sm:inline-flex">Method</a>
            <Button className="ml-2 bg-emerald-300 text-[#07110e] hover:bg-emerald-200" onClick={() => chooseProfile('commerce')}>
              <RotateCcw className="size-3.5" /> New evaluation
            </Button>
          </nav>
        </div>
      </header>

      <section id="top" className="scroll-mt-20 border-b border-white/8 bg-[#09110f]">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(470px,.95fr)] lg:px-8 lg:py-14">
          <div className="max-w-3xl self-center">
            <div className="mb-5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-200/70">
              <CircleDot className="size-3.5" /> Evaluate the contract, not just the URL
            </div>
            <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.055em] text-white sm:text-5xl lg:text-[62px]">
              Tell us what the WebMCP is for.
              <span className="block text-white/35">Then test whether it delivers.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-white/55 sm:text-lg">
              Generic scanners reward surface area. Prism scores the tool contract against a declared job, its real side effects, and the evidence a person can verify on the page.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/45">
              <span className="flex items-center gap-2"><Check className="size-3.5 text-emerald-300" /> Purpose-specific coverage</span>
              <span className="flex items-center gap-2"><Check className="size-3.5 text-emerald-300" /> Mutation read-back</span>
              <span className="flex items-center gap-2"><Check className="size-3.5 text-emerald-300" /> Human approval boundaries</span>
            </div>
          </div>

          <div id="profiles" className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Evaluation setup</p>
                <p className="mt-1 text-xs text-white/40">A declared contract keeps the score honest.</p>
              </div>
              <Badge className="border border-emerald-200/20 bg-emerald-200/10 text-emerald-100">Profile + evidence</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-[145px_1fr] sm:items-start">
              <label className="pt-2 text-xs font-medium text-white/60" htmlFor="profile">What is it?</label>
              <div>
                <NativeSelect id="profile" className="w-full" value={profile} onChange={(event) => chooseProfile(event.target.value as ProfileKey)}>
                  <NativeSelectOption value="commerce">Commerce & checkout</NativeSelectOption>
                  <NativeSelectOption value="operations">Project operations</NativeSelectOption>
                  <NativeSelectOption value="editor">Content editor</NativeSelectOption>
                  <NativeSelectOption value="custom">Custom contract</NativeSelectOption>
                </NativeSelect>
                <p className="mt-2 text-xs leading-5 text-white/40">{evaluationProfile.intent}</p>
              </div>

              <label className="pt-2 text-xs font-medium text-white/60" htmlFor="target-url">Target label</label>
              <Input
                id="target-url"
                type="url"
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                className="h-10 border-white/10 bg-black/20 px-3 text-white placeholder:text-white/25 focus-visible:border-emerald-300/50 focus-visible:ring-emerald-300/15"
                aria-label="WebMCP target URL label"
              />
            </div>

            {profile === 'custom' && (
              <div className="mt-5 rounded-xl border border-emerald-200/15 bg-emerald-200/[0.045] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-emerald-100"><Sparkles className="size-3.5" /> Custom evaluation contract</div>
                <label className="text-[11px] text-white/45" htmlFor="custom-intent">The job to be done</label>
                <Textarea id="custom-intent" value={customIntent} onChange={(event) => setCustomIntent(event.target.value)} className="mt-1 min-h-16 border-white/10 bg-black/15 text-xs text-white" />
                <label className="mt-3 block text-[11px] text-white/45" htmlFor="custom-tools">Expected tool names, comma separated</label>
                <Input id="custom-tools" value={customTools} onChange={(event) => setCustomTools(event.target.value)} className="mt-1 border-white/10 bg-black/15 text-xs text-white" />
                <label className="mt-3 block text-[11px] text-white/45" htmlFor="custom-approval">What must remain human-approved?</label>
                <Input id="custom-approval" value={customApproval} onChange={(event) => setCustomApproval(event.target.value)} className="mt-1 border-white/10 bg-black/15 text-xs text-white" />
              </div>
            )}

            <div className="mt-5 rounded-xl border border-white/8 bg-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-white/60">Evidence source</span>
                <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => setSourceMode('sample')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition ${sourceMode === 'sample' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
                  >
                    <FlaskConical className="size-3" /> Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('snapshot')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition ${sourceMode === 'snapshot' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
                  >
                    <ClipboardPaste className="size-3" /> Runner snapshot
                  </button>
                </div>
              </div>

              {sourceMode === 'sample' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {evaluationProfile.capabilities.map((capability) => (
                    <code key={capability.id} className="rounded-md border border-white/8 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/65">{capability.candidates[0]}</code>
                  ))}
                </div>
              ) : (
                <div className="mt-3">
                  <Textarea
                    value={snapshotText}
                    onChange={(event) => setSnapshotText(event.target.value)}
                    spellCheck={false}
                    aria-label="Runner snapshot JSON"
                    className="max-h-48 min-h-36 resize-y border-white/10 bg-[#050a08] font-mono text-[10px] leading-4 text-emerald-50/75 focus-visible:border-emerald-300/40 focus-visible:ring-emerald-300/10"
                  />
                  <p className="mt-2 text-[10px] leading-4 text-white/35">Paste a browser-runner snapshot with <code>runtime</code>, <code>tools</code>, annotations, and behavioral evidence.</p>
                </div>
              )}
            </div>

            {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
            {importNotice && <output className="mt-3 block rounded-lg border border-emerald-200/15 bg-emerald-200/[0.06] px-3 py-2 text-xs text-emerald-100">{importNotice}</output>}

            <Button size="lg" className="mt-5 h-11 w-full bg-emerald-300 text-[#07110e] hover:bg-emerald-200" onClick={runEvaluation}>
              <Play className="size-4 fill-current" />
              {sourceMode === 'sample' ? 'Run purpose-aware example' : 'Evaluate runner snapshot'}
              <ArrowRight className="ml-auto size-4" />
            </Button>
          </div>
        </div>
      </section>

      <section id="report" className="mx-auto max-w-[1500px] scroll-mt-20 px-5 py-8 lg:px-8 lg:py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><Gauge className="size-4" /> {scanned ? 'Latest evaluation' : 'Example evaluation'}</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">A score that explains what “good” means</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-emerald-400" /> Contract profile: {evaluationProfile.label}</div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1.35fr)_minmax(340px,.9fr)]">
          <article className="score-card rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Purpose fit</p>
                <p className="mt-3 text-6xl font-semibold tracking-[-0.07em]">{report.score}</p>
              </div>
              <Badge className={report.label === 'Strong' ? 'bg-emerald-100 text-emerald-800' : report.label === 'Incomplete' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}>{report.label}</Badge>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${report.score}%` }} /></div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{report.summary}</p>
            <a href="#dimensions" className="mt-6 flex w-full items-center justify-between border-t pt-4 text-sm font-medium">See scoring evidence <ChevronRight className="size-4" /></a>
          </article>

          <article className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold">Journey coverage</p><p className="mt-1 text-xs text-muted-foreground">Expected job → discovered tool → observable outcome</p></div>
              <Braces className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-5 space-y-3">
              {report.journey.map((row) => (
                <div key={row.job} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 rounded-xl border bg-background/50 px-3 py-3" title={row.note}>
                  <span className={`grid size-6 place-items-center rounded-full ${findingTone(row.state)}`}>{findingIcon(row.state)}</span>
                  <div className="min-w-0"><p className="text-sm font-medium">{row.job}</p><code className="font-mono text-[10px] text-muted-foreground">{row.tool ?? 'missing capability'}</code></div>
                  <Badge variant="outline" className="hidden sm:inline-flex">{row.state === 'pass' ? 'covered' : row.state === 'warn' ? 'weak proof' : 'missing'}</Badge>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold">Evidence, not vibes</p><p className="mt-1 text-xs text-muted-foreground">Checks are tied to the declared contract.</p></div>
              <ShieldCheck className="size-5 text-emerald-600" />
            </div>
            <div className="mt-5 divide-y">
              {report.findings.slice(0, 4).map((finding) => (
                <div key={finding.title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${findingTone(finding.state)}`}>{findingIcon(finding.state)}</span>
                  <div><p className="text-sm font-medium leading-5">{finding.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{finding.detail}</p></div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div id="dimensions" className="mt-4 grid scroll-mt-20 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {report.dimensions.map((dimension) => (
            <article key={dimension.name} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between"><p className="text-sm font-medium">{dimension.name}</p><span className="font-mono text-sm font-semibold text-emerald-700">{dimension.score}</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${dimension.score}%` }} /></div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{dimension.explanation}</p>
            </article>
          ))}
        </div>

        <div id="method" className="mt-10 scroll-mt-24 overflow-hidden rounded-2xl border bg-[#101916] text-white">
          <div className="grid lg:grid-cols-[.9fr_1.1fr]">
            <div className="border-b border-white/8 p-6 lg:border-b-0 lg:border-r lg:p-8">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-200/60"><MonitorDot className="size-3.5" /> Honest execution boundary</div>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.035em]">The browser observes. The dashboard judges.</h3>
              <p className="mt-3 text-sm leading-6 text-white/50">WebMCP tools belong to the page that registered them. A normal hosted scanner cannot discover or execute another origin&apos;s tools through an iframe or an HTTP fetch. Prism therefore separates collection from evaluation.</p>
              <Alert className="mt-5 border-emerald-200/15 bg-emerald-200/[0.06] text-emerald-50">
                <ShieldCheck />
                <AlertTitle>Live browser companion available</AlertTitle>
                <AlertDescription className="text-emerald-50/55">
                  Discover the current tool set, run a browser-mediated check, and import the evidence here.{' '}
                  <a className="font-medium text-emerald-200 underline underline-offset-4 hover:text-white" href="https://prism.alx21.chatgpt.site/prism-webmcp-companion.zip">Download the MIT-licensed extension</a>.
                </AlertDescription>
              </Alert>
            </div>
            <div className="grid gap-px bg-white/8 sm:grid-cols-3">
              {[
                [TerminalSquare, '1 · Declare', 'Choose the product type, job, expected tools, and human-only boundary.'],
                [Code2, '2 · Collect', 'A compatible browser opens the target page, discovers tools, executes test cases, and records state evidence.'],
                [ScanSearch, '3 · Evaluate', 'Prism maps observed behavior to the declared journey and produces an explainable repair list.'],
              ].map(([Icon, title, detail]) => {
                const StepIcon = Icon as typeof TerminalSquare;
                return (
                  <div key={title as string} className="bg-[#101916] p-6 lg:p-8">
                    <StepIcon className="size-5 text-emerald-300" />
                    <p className="mt-5 text-sm font-medium">{title as string}</p>
                    <p className="mt-2 text-xs leading-5 text-white/45">{detail as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            [Layers3, 'Declared context', 'Choose a profile or define the exact user journey and expected capabilities.'],
            [FlaskConical, 'Behavioral checks', 'Exercise tools and compare their results with the same live page state.'],
            [Sparkles, 'Actionable repairs', 'Get a contract-level fix with the evidence required to re-run the check.'],
          ].map(([Icon, title, detail]) => {
            const FeatureIcon = Icon as typeof Layers3;
            return (
              <div key={title as string} className="flex gap-3 rounded-xl border border-dashed bg-card/40 p-4">
                <FeatureIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <div><p className="text-sm font-medium">{title as string}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail as string}</p></div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t bg-card/50 px-5 py-6 text-center text-xs text-muted-foreground">Prism evaluates WebMCP contracts through declared purpose, page-scoped evidence, and human-in-the-loop checks.</footer>
    </main>
  );
}

