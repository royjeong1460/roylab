import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const tabs = JSON.parse(await readFile(new URL('app/lib/site-tabs.json', root), 'utf8'));
const template = await readFile(new URL('templates/tabletop.html', root), 'utf8');
for (const game of tabs.filter(tab => tab.id !== 'lab')) {
  const links = tabs.map(tab => {
    const current = tab.id === game.id ? ' aria-current="page"' : '';
    return `<a id="tab-${tab.id}" data-section="${tab.id}" href="${tab.href}"${current}>${tab.label}</a>`;
  });
  const directory = new URL('public' + game.href, root);
  await mkdir(directory, {recursive: true});
  const html = template.replaceAll('{{title}}', game.label).replace('{{tabs}}', links.join('\n    '))
    .replace('id="' + game.id + '" aria-labelledby="tab-' + game.id + '" hidden', 'id="' + game.id + '" aria-labelledby="tab-' + game.id + '"');
  await writeFile(new URL('index.html', directory), html);
}
