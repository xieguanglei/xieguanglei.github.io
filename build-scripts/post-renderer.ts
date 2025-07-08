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
    description?: string;
    keywords?: string[];
    tags?: string[];
    [key: string]: any;
}

export interface Post {
    date: string;
    title: string;
    path: string;
    postPath: string;
    keywords: string[];
    tags: string[];
    description?: string;
    hidden?: boolean;
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
                        return renderMathToSVG(token.text);
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

        this.marked.use({ renderer });
    }

    async parsePost(post: Post): Promise<Post> {
        const indexMd = path.join(post.path, 'index.md');

        const content = await fs.readFile(indexMd, 'utf-8');
        const { data: frontMatter, content: markdown } = matter(content);
        
        if (!post.postPath) {
            throw new Error(`文章 ${post.date}/${post.title} 缺少 path 字段`);
        }

        return {
            ...post,
            ...frontMatter,
            content: await this.renderContent(markdown),
            url: `/blog/${post.date}/${post.postPath}/`
        };
    }

    private async renderContent(markdown: string): Promise<string> {
        return await this.marked.parse(markdown);
    }
}