import { Marked, Renderer } from 'marked';
import { markedHighlight } from "marked-highlight";

import matter from 'gray-matter';
import * as fs from 'fs-extra';
import * as path from 'path';
import yaml from 'js-yaml';
import hljs from 'highlight.js';

import { renderMathToSVG } from './render-math';


export interface PostMeta {
    path?: string;
    [key: string]: any;
}

export interface Post {
    date: string;
    title: string;
    path: string;
    postPath: string;
    content?: string;
    url?: string;
    formattedDate?: string;
    [key: string]: any;
}

export class PostRenderer {

    marked: Marked;

    constructor() {

        this.marked = new Marked(
            markedHighlight({
                async: true,
                emptyLangClass: 'hljs',
                langPrefix: 'hljs language-',
                highlight(code, lang, info) {
                    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                    return hljs.highlight(code, { language }).value;
                }
            })
        );

        this.marked.use({
            extensions: [
                {
                    name: 'math-inline',
                    level: 'inline',
                    start(src) { return src.indexOf('$'); },
                    tokenizer(src) {
                        const match = src.match(/^\$+([^$\n]+?)\$+/);
                        if (match) {
                            return {
                                type: 'math-inline',
                                raw: match[0],
                                text: match[1].trim()
                            };
                        }
                        return undefined;
                    },
                    renderer(token) {
                        return renderMathToSVG(token.text);
                    }
                },
                {
                    name: 'math',
                    level: 'block',
                    start(src) { return src.indexOf('\\begin'); },
                    tokenizer(src) {
                        const match = src.match(/^\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/);
                        if (match) {
                            return {
                                type: 'math',
                                raw: match[0],
                                text: match[0]
                            };
                        }
                        return undefined;
                    },
                    renderer(token) {
                        console.log('===>');
                        console.log(token.text);
                        const a = renderMathToSVG(token.text);
                        console.log(a);
                        return a;
                    }
                }
            ]
        })

        const renderer = new Renderer();

        const renderImage = renderer.image;
        renderer.image = function(image): string {
            const { text } = image;
            const origin: string = renderImage.call(this, image);
            if (text) {
                return `<figure>${origin}<figurecaption>${text}</figcaption></figure>`;
            } else {
                return origin;
            }
        }

        // const renderParagraph = renderer.paragraph;
        // renderer.paragraph = function(paragraph): string {

        //     let { text } = paragraph;

        //     if (text.startsWith('\\begin')) {
        //         text = text.replaceAll('&amp;', '&');
        //         text = renderMathToSVG(text);
        //     } else if (text.includes('$')) {
        //         const parts = text.split('$');
        //         if (parts.length % 2 === 1) {
        //             let transformed: string[] = [];
        //             for (const [i, part] of parts.entries()) {
        //                 if (i % 2 === 0) {
        //                     transformed[i] = part;
        //                 } else {
        //                     let p = parts[i];
        //                     p = p.replaceAll('&amp;', '&');
        //                     transformed[i] = renderMathToSVG(p);
        //                 }
        //             }
        //             text = transformed.join('');
        //         }
        //     }

        //     return renderParagraph.call(this, { ...paragraph, text });
        // }

        this.marked.use({ renderer });
    }

    async parsePost(post: Post): Promise<Post> {
        const indexMd = path.join(post.path, 'index.md');
        const indexYaml = path.join(post.path, 'index.yaml');

        const content = await fs.readFile(indexMd, 'utf-8');
        const metaContent = await fs.readFile(indexYaml, 'utf-8');
        const meta = yaml.load(metaContent) as PostMeta;

        const { data: frontMatter, content: markdown } = matter(content);
        if (!post.postPath) {
            throw new Error(`文章 ${post.date}/${post.title} 缺少 path 字段`);
        }

        return {
            ...post,
            ...meta,
            ...frontMatter,
            content: await this.renderContent(markdown),
            url: `/blog/${post.date}/${post.postPath}/`
        };
    }

    private async renderContent(markdown: string): Promise<string> {
        return await this.marked.parse(markdown);
    }
}