/** Host half of the CLI progress HUD bundle: one prompt hint; the Client module owns rendering. */
export const inject = ['systemPrompt'];

export function apply(ctx) {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'cli-progress-hud',
    order: 90,
    text: [
      'The web composer shows a live progress strip for running shell jobs.',
      'When a command may run longer than a few seconds, run it in the background if the shell tool supports that,',
      'and force progress output where the command offers a flag:',
      'git clone/fetch/push --progress, curl --progress-bar, rsync --info=progress2.',
      'Do not add a flag to a command that does not accept it.',
    ].join(' '),
  }), 'cli-progress-hud: progress hint');
}
