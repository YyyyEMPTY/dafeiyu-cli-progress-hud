/**
 * CLI progress HUD — a composer-dock strip that mirrors this session's running
 * shell jobs and parses the last progress line out of their live output.
 *
 * Data comes from the official job-controller client service (`ctx.jobs`):
 * `watchRows` keeps the session roster open, `observe` opens the job's output
 * stream while the strip is mounted. No host RPC of our own is involved.
 */
window.__ModuleLoader__.load({
  id: 'dafeiyu-cli-progress-hud',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useState } = React;

    const NS = 'cli-progress-hud';
    const EMPTY_ROWS = [];
    const EMPTY_OBSERVED = {};
    const MIN_AGE_MS = 1200;
    const MAX_ROWS = 3;
    const TAIL_CHARS = 16384;

    const DICT = {
      zh: {
        title: '命令行任务',
        waiting: '等待输出…',
        stopping: '正在停止…',
        unnamed: '未命名任务',
        more: '另有 {count} 个任务',
      },
      en: {
        title: 'Command tasks',
        waiting: 'Waiting for output…',
        stopping: 'Stopping…',
        unnamed: 'Unnamed task',
        more: '{count} more',
      },
    };

    const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
    const OSC_RE = /\x1b\][^\x07]*(?:\x07|\x1b\\)/g;

    function stripAnsi(text) {
      return text.replace(OSC_RE, '').replace(ANSI_RE, '');
    }

    function parseProgress(raw) {
      if (!raw) return { percent: null, phase: '', line: '' };
      const text = stripAnsi(raw).slice(-TAIL_CHARS);
      const lines = text.split(/\r\n|\r|\n/);
      let fallback = '';
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i].trim();
        if (!line) continue;
        if (!fallback) fallback = line;

        const percents = line.match(/(\d{1,3}(?:\.\d+)?)\s*%/g);
        if (percents && percents.length > 0) {
          const value = parseFloat(percents[percents.length - 1]);
          if (Number.isFinite(value)) {
            const percent = Math.max(0, Math.min(100, value));
            let phase = '';
            const named = line.match(/([A-Za-z][A-Za-z ._-]{2,40}?):\s*\d{1,3}(?:\.\d+)?\s*%/);
            if (named) {
              phase = named[1].replace(/^remote:\s*/i, '').trim();
            } else {
              const colon = line.indexOf(':');
              if (colon > 0 && colon <= 40) phase = line.slice(0, colon).trim();
            }
            return { percent, phase, line };
          }
        }

        // curl's default meter has no percent sign; its first column is percent.
        const curl = line.match(/^\s*(\d{1,3})\s+\S+\s+\d+\s+\S+\s+\d+\s+\S+.*\d+:\d{2}/);
        if (curl) {
          const percent = parseInt(curl[1], 10);
          if (percent >= 0 && percent <= 100) return { percent, phase: 'curl', line };
        }
      }
      return { percent: null, phase: '', line: fallback };
    }

    function formatElapsed(ms) {
      const total = Math.max(0, Math.floor(ms / 1000));
      const seconds = total % 60;
      const minutes = Math.floor(total / 60) % 60;
      const hours = Math.floor(total / 3600);
      const pad = (value) => String(value).padStart(2, '0');
      if (hours > 0) return hours + ':' + pad(minutes) + ':' + pad(seconds);
      return minutes + ':' + pad(seconds);
    }

    function startedAt(job) {
      const value = typeof job.startedAt === 'number' ? job.startedAt : Date.parse(job.startedAt);
      return Number.isFinite(value) ? value : Date.now();
    }

    function interpolate(template, params) {
      if (!params) return template;
      return template.replace(/\{(\w+)\}/g, (match, key) => (
        key in params ? String(params[key]) : match
      ));
    }

    const styles = {
      root: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        padding: '2px 2px 0',
        fontFamily: 'inherit',
        fontSize: '12px',
        lineHeight: '16px',
        color: 'var(--dsw-alias-label-secondary)',
      },
      head: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: 'var(--dsw-alias-label-tertiary)',
        fontSize: '11px',
        lineHeight: '14px',
        userSelect: 'none',
      },
      dot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'var(--dsw-alias-label-primary)',
        flexShrink: 0,
      },
      count: { fontVariantNumeric: 'tabular-nums' },
      list: { display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0 },
      row: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
      top: { display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 },
      label: {
        flex: '1 1 auto',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: 'var(--dsw-alias-label-secondary)',
      },
      pct: {
        flexShrink: 0,
        fontVariantNumeric: 'tabular-nums',
        fontSize: '11px',
        color: 'var(--dsw-alias-label-primary)',
      },
      track: {
        position: 'relative',
        height: '2px',
        borderRadius: '2px',
        background: 'var(--dsw-alias-fill-l1)',
        overflow: 'hidden',
      },
      fill: {
        height: '100%',
        borderRadius: '2px',
        background: 'var(--dsw-alias-label-primary)',
        transition: 'width 240ms ease',
      },
      idle: { width: '22%', opacity: 0.45 },
      meta: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '8px',
        minWidth: 0,
        color: 'var(--dsw-alias-label-tertiary)',
        fontSize: '11px',
        lineHeight: '14px',
      },
      phase: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      time: { flexShrink: 0, fontVariantNumeric: 'tabular-nums' },
      more: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '11px', lineHeight: '14px' },
    };

    function Hud(props) {
      const { sessionId, useJobs, watchRows, observe, t } = props;
      const text = (key, params) => (
        typeof t === 'function'
          ? t(key, params)
          : interpolate(DICT.en[key] || key, params)
      );

      const sessionKey = String(sessionId);
      const rows = useJobs((state) => state.rows[sessionKey]) || EMPTY_ROWS;
      const observed = useJobs((state) => state.observed) || EMPTY_OBSERVED;

      useEffect(() => watchRows(sessionId), [sessionId, watchRows]);

      const live = useMemo(
        () => rows.filter((job) => job.status === 'running' || job.status === 'stopping'),
        [rows],
      );
      const liveIds = live.map((job) => String(job.id));
      const liveKey = liveIds.join('|');

      useEffect(() => {
        const releases = liveIds.map((id) => observe(sessionId, id));
        return () => {
          for (const release of releases) {
            try {
              release();
            } catch {
              /* teardown already happened */
            }
          }
        };
      }, [sessionId, liveKey, observe]);

      const [now, setNow] = useState(() => Date.now());
      useEffect(() => {
        if (live.length === 0) return undefined;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
      }, [live.length]);

      const items = [];
      for (const job of live) {
        const view = observed[String(job.id)];
        const raw = (view && view.text) || job.progress || '';
        const parsed = parseProgress(raw);
        const stopping = job.status === 'stopping';
        const age = Math.max(0, now - startedAt(job));
        // A foreground shell call is a job too; hide sub-second ones so quick
        // commands do not flash the strip. A parsed percent proves real work.
        if (parsed.percent === null && age < MIN_AGE_MS && !stopping) continue;
        items.push({
          job,
          percent: parsed.percent === null ? null : Math.round(parsed.percent),
          phase: parsed.phase || parsed.line || (stopping ? text('stopping') : text('waiting')),
          elapsed: formatElapsed(age),
        });
      }

      if (items.length === 0) return null;

      const shown = items.slice(0, MAX_ROWS);
      const hidden = items.length - shown.length;

      return h('div', {
        style: styles.root,
        role: 'status',
        'aria-live': 'polite',
      },
        h('div', { style: styles.head },
          h('span', { style: styles.dot, 'aria-hidden': true }),
          h('span', null, text('title')),
          h('span', { style: styles.count }, String(items.length)),
        ),
        h('div', { style: styles.list },
          shown.map((item) => h('div', { key: String(item.job.id), style: styles.row },
            h('div', { style: styles.top },
              h('span', { style: styles.label, title: item.job.label }, item.job.label || text('unnamed')),
              h('span', { style: styles.pct }, item.percent === null ? '' : item.percent + '%'),
            ),
            h('div', { style: styles.track },
              h('div', {
                style: item.percent === null
                  ? { ...styles.fill, ...styles.idle }
                  : { ...styles.fill, width: item.percent + '%' },
              }),
            ),
            h('div', { style: styles.meta },
              h('span', { style: styles.phase, title: item.phase }, item.phase),
              h('span', { style: styles.time }, item.elapsed),
            ),
          )),
          hidden > 0 ? h('div', { style: styles.more }, text('more', { count: hidden })) : null,
        ),
      );
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, DICT), NS + ': dictionaries');
      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'cli-progress-hud',
        order: 10,
        locale: NS,
        inject: () => ({
          hooks: { jobs: ctx.jobs.state },
          watchRows: (sessionId) => ctx.jobs.watchRows(sessionId),
          observe: (sessionId, jobId) => ctx.jobs.observe(sessionId, jobId),
        }),
      }, Hud));
    }

    const plugin = { inject: ['jobs', 'slots', 'locale'], apply };
    // Exposed only for the offline parser fixture; the loader ignores it.
    if (typeof window !== 'undefined' && window.__CLI_PROGRESS_HUD_TEST__) {
      plugin.parseProgress = parseProgress;
      plugin.formatElapsed = formatElapsed;
    }
    return plugin;
  },
});
