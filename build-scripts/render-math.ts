// renderMath.ts
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({
  packages: ['base', 'ams']
});

const svg = new SVG({ fontCache: 'none' });

const html = mathjax.document('', { InputJax: tex, OutputJax: svg });

export const renderMathToSVG = (latex: string, display: boolean = false): string => {
  const node = html.convert(latex, { display });
  return adaptor.outerHTML(node);
}
