import type { Plugin } from 'vite';
import type { OutputBundle } from 'rollup';

type FilePattern = RegExp | string;
type LangConfig = {
	filePatterns: FilePattern[];
	pre: string;
	post: string;
};

type PluginOptions = {
	bundleName: string;
	css: Partial<LangConfig>;
	js: Partial<LangConfig>;
	integrations: {
		sveltekit: boolean;
	};
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

function getLangConfig(currConfig: Partial<LangConfig>, defaultConfig: LangConfig): LangConfig {
	return {
		filePatterns: currConfig.filePatterns ?? defaultConfig.filePatterns,
		pre: currConfig.pre ?? defaultConfig.pre,
		post: currConfig.post ?? defaultConfig.post
	};
}

function getConfig(opts: Partial<PluginOptions>): PluginOptions & {
	css: LangConfig;
	js: LangConfig;
} {
	return {
		bundleName: opts.bundleName ?? 'bundle.js',
		css: getLangConfig(opts.css ?? {}, {
			filePatterns: [new RegExp('\\.css$', 'm')],
			pre: '',
			post: ''
		}),
		js: getLangConfig(opts.js ?? {}, {
			filePatterns: [new RegExp('\\.js$', 'm')],
			pre: '',
			post: ''
		}),
		integrations: {
			sveltekit: opts.integrations?.sveltekit ?? false
		}
	};
}

function checkMatch(text: string, patterns: FilePattern[]): boolean {
	return patterns.some((r) => text.match(r));
}

export default function plugin(opts: Partial<PluginOptions> = {}): Plugin {
	const currOpts = getConfig(opts);

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
					if (checkMatch(name, currOpts.css.filePatterns)) {
						filesCSS.push(name);
						css += getCode(bundle, name);
					} else if (checkMatch(name, currOpts.js.filePatterns)) {
						filesJS.push(name);
						js += getCode(bundle, name);
					}
				}

				let source: string = '';

				if (js.length > 0) {
					if (currOpts.integrations.sveltekit) {
						const sveltekitHash = js.match(new RegExp('this\\.__sveltekit_([a-zA-Z0-9]+)='));
						if (sveltekitHash) {
							const hash = sveltekitHash[1];
							if (hash.length > 0) {
								currOpts.js.pre = `
${currOpts.js.pre}

__sveltekit_${hash} = {
	base: new URL('.', location).pathname.slice(0, -1)
};

const element = document.currentScript.parentElement;
`;
								currOpts.js.post = `
__sveltekit_${hash}.app.start(element);

${currOpts.js.post}
`;
							}
						}
					}

					source = `
${currOpts.js.pre}
${js}
${currOpts.js.post}`;
				}

				if (css.length > 0) {
					css = css.replaceAll('\\', '\\\\')

					source = `
${source}

${currOpts.css.pre}
const inlineStyle = document.createElement('style');
inlineStyle.innerHTML = \`${css}\`;

document.body.appendChild(inlineStyle);
${currOpts.css.post}`;
				}

				this.emitFile({
					type: 'asset',
					fileName: currOpts.bundleName,
					source: source
				});

				this.info(`CSS Files bundled into ${currOpts.bundleName}: [${filesCSS}]`);
				this.info(`JS Files bundled into ${currOpts.bundleName}: [${filesJS}]`);
			}
		}
	};
}
