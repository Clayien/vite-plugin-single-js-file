import type { Plugin } from 'vite';
import type { OutputBundle } from 'rollup';

type FilePattern = RegExp | string;

type PluginOptions = {
	bundleName?: string;
	filePatternsCSS?: FilePattern[];
	filePatternsJS?: FilePattern[];
};

function getCode(bundle: OutputBundle, name: string): string {
	const file = bundle[name];

	if ('code' in file) {
		return file.code;
	}

	let output: string = '';
	const source = file.source;

	if (typeof source === 'string') {
		output = source;
	} else if (typeof source === 'string') {
		output = new TextDecoder().decode(source as Uint8Array<ArrayBufferLike>);
	}

	return output;
}

function checkMatch(text: string, patterns: FilePattern[]): boolean {
	return patterns.some((r) => text.match(r));
}

export default function plugin(opts: PluginOptions = {}): Plugin {
	const bundleName = opts.bundleName ?? 'bundle.js';

	const filePatternsCSS = opts.filePatternsCSS ?? [new RegExp('\\.css$', 'm')];
	const filePatternsJS = opts.filePatternsJS ?? [new RegExp('\\.js$', 'm')];

	return {
		name: '@clayien/vite-plugin-js-css-to-single',

		generateBundle: {
			order: 'post',

			handler(_, bundle) {
				let css: string = '';
				let js: string = '';

				for (const name in bundle) {
					if (checkMatch(name, filePatternsCSS)) {
						css += getCode(bundle, name);
					} else if (checkMatch(name, filePatternsJS)) {
						js += getCode(bundle, name);
					}
				}

				if (css.length > 0) {
					const source: string = `
${js}

const inlineStyle = document.createElement('style');
inlineStyle.innerHTML = \`${css}\`;

document.body.appendChild(inlineStyle);
      `;

					this.emitFile({
						type: 'asset',
						fileName: bundleName,
						source: source
					});
				}
			}
		}
	};
}
