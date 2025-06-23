import type { Plugin } from 'vite';
import type { OutputBundle } from 'rollup';

type FilePattern = RegExp | string;
type LangConfig = {
	filePatterns: FilePattern[];
	pre: string;
	post: string;
};

type PluginOptions = {
	bundleName?: string;
	css?: Partial<LangConfig>;
	js?: Partial<LangConfig>;
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

function getDefaultConfig(currConfig: Partial<LangConfig>, defaultConfig: LangConfig): LangConfig {
	return {
		filePatterns: currConfig.filePatterns ?? defaultConfig.filePatterns,
		pre: currConfig.pre ?? defaultConfig.pre,
		post: currConfig.post ?? defaultConfig.post
	};
}

function checkMatch(text: string, patterns: FilePattern[]): boolean {
	return patterns.some((r) => text.match(r));
}

export default function plugin(opts: PluginOptions = {}): Plugin {
	const bundleName = opts.bundleName ?? 'bundle.js';

	const cssConfig = getDefaultConfig(opts.css ?? {}, {
		filePatterns: [new RegExp('\\.css$', 'm')],
		pre: '',
		post: ''
	});

	const jsConfig = getDefaultConfig(opts.js ?? {}, {
		filePatterns: [new RegExp('\\.js$', 'm')],
		pre: '',
		post: ''
	});

	return {
		name: '@clayien/vite-plugin-single-js-file',

		generateBundle: {
			order: 'post',

			handler(_, bundle) {
				const filesCSS: string[] = [];
				let css: string = '';

				const filesJS: string[] = [];
				let js: string = '';

				for (const name in bundle) {
					if (checkMatch(name, cssConfig.filePatterns)) {
						filesCSS.push(name);
						css += getCode(bundle, name);
					} else if (checkMatch(name, jsConfig.filePatterns)) {
						filesJS.push(name);
						js += getCode(bundle, name);
					}
				}

				let source: string = '';

				if (js.length > 0) {
					source = `
${jsConfig.pre}
${js}
${jsConfig.post}`;
				}

				if (css.length > 0) {
					source = `
${source}

${cssConfig.pre}
const inlineStyle = document.createElement('style');
inlineStyle.innerHTML = \`${css}\`;

document.body.appendChild(inlineStyle);
${cssConfig.post}`;
				}

				this.emitFile({
					type: 'asset',
					fileName: bundleName,
					source: source
				});

				this.info(`CSS Files bundled into ${bundleName}: [${filesCSS}]`);
				this.info(`JS Files bundled into ${bundleName}: [${filesJS}]`);
			}
		}
	};
}
