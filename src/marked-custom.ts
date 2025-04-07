import { marked } from 'marked';

interface ImageWithSizeToken {
  type: 'image';
  raw: string;
  href: string;
  title?: string;
  text: string;
  width?: string;
  height?: string;
}

marked.use({
  extensions: [
    {
      name: 'imageWithSize',
      level: 'inline',
      start(src: string) {
        return src.match(/!\[.*?\]\(.*?\s=\d+x\d+\)/)?.index;
      },
      tokenizer(src: string) {
        const match = /^!\[(.*?)\]\((.*?)(?:\s*=\s*(\d+)x(\d+))?\)/.exec(src);
        if (match) {
          return {
            type: 'image',
            raw: match[0],
            href: match[2].split(/\s+/)[0],
            text: match[1],
            tokens: [],
            width: match[3],
            height: match[4]
          } as ImageWithSizeToken & { width?: string; height?: string };
          ;
        }
        return;
      }
    }
  ]
});

const renderer = new marked.Renderer();

renderer.image = function (token: any) {

  // Hacky grab of the current token from the parser stack
  //const token = this.parser?.tokens?.[this.parser.tokens.length - 1] as any;
  const { href, title, text, width, height } = token;

  const widthAttr = width ? ` width="${width}"` : '';
  const heightAttr = height ? ` height="${height}"` : '';
  const titleAttr = title ? ` title="${title}"` : '';
  const fluidClass =  href == '/images/hero.jpg' ? '' : ' class="img-fluid" ';
  const alt = text || '';

  return `<img src="${href}" alt="${alt}"${titleAttr}${widthAttr}${heightAttr}${fluidClass}>`;
};

marked.use({ renderer });

export { marked };
