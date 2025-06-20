import type { Plugin } from 'vite';
import type { OutputBundle } from 'rollup';

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

export default function plugin(): Plugin {
	return {
		name: '@clayien/vite-plugin-js-css-to-single',

		generateBundle: {
			order: 'post',

			handler(_, bundle) {
				let css: string = '';
				let js: string = '';

				for (const name in bundle) {
					if (name.endsWith('.css')) {
						css += getCode(bundle, name);
					} else if (name.endsWith('.js')) {
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
						fileName: 'bundle.js',
						source: source
					});
				}
			}
		}
	};
}
