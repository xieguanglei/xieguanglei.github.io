import * as fs from 'fs-extra';
import path from 'path';
import moment from 'moment';
import ejs from 'ejs';
import yaml from 'js-yaml';
import RSS from 'rss';
import matter from 'gray-matter';
import { PostRenderer, Post, PostMeta } from './post-renderer';

// 配置
const SOURCE_DIR = path.join(__dirname, '..', 'source');
const OUTPUT_DIR = path.join(__dirname, '..', 'dist');
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const BUILD_ASSETS_DIR = path.join(__dirname, 'assets');

// 创建文章渲染器
const postRenderer = new PostRenderer();

// 确保输出目录存在
fs.ensureDirSync(OUTPUT_DIR);

// 读取模板文件
const postTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'post.html'), 'utf-8');
const indexTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf-8');

// 配置 EJS 选项
const ejsOptions = {
    async: false,
    filename: path.join(TEMPLATES_DIR, 'index.html'),
    root: TEMPLATES_DIR
};

// 扫描文章目录（不含文章内容），按照日期降序排序
async function scanPosts(): Promise<Post[]> {
    const posts: Post[] = [];
    console.log('正在扫描目录:', SOURCE_DIR);
    
    try {
        const dirs = await fs.readdir(SOURCE_DIR);
        console.log('找到的目录:', dirs);
        
        for (const dir of dirs) {
            // 检查目录名是否符合日期格式 (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dir)) {
                console.log('跳过非日期格式目录:', dir);
                continue;
            }
            
            const postDir = path.join(SOURCE_DIR, dir);
            console.log('处理文章目录:', postDir);
            
            try {
                const postDirs = await fs.readdir(postDir);
                
                for (const postName of postDirs) {
                    const postPath = path.join(postDir, postName);
                    const stat = await fs.stat(postPath);
                    
                    if (stat.isDirectory()) {
                        const indexMd = path.join(postPath, 'index.md');
                        
                        if (await fs.pathExists(indexMd)) {
                            const content = await fs.readFile(indexMd, 'utf-8');
                            const { data: meta } = matter(content);
                            
                            posts.push({ 
                                date: dir, 
                                title: postName, 
                                path: postPath, 
                                postPath: meta.path || '',
                                hidden: meta.hidden || false 
                            });
                            console.log('找到文章:', dir, postName, meta.path, meta.hidden ? '(hidden)' : '');
                        }
                    }
                }
            } catch (err) {
                console.error('处理目录时出错:', postDir, err);
            }
        }
    } catch (err) {
        console.error('扫描目录时出错:', err);
        throw err;
    }
    
    // 按日期降序排序
    return posts.sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
}

// 生成文章页面
async function generatePostPage(post: Post): Promise<void> {
    const html = await ejs.render(postTemplate, {
        title: post.title,
        date: moment(post.date).format('YYYY / MM / DD'),
        content: post.content
    }, ejsOptions);

    const outputPath = path.join(OUTPUT_DIR, 'blog', post.date, post.postPath, 'index.html');
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, html);
}

// 生成首页
async function generateIndexPage(posts: Post[]): Promise<void> {
    // 过滤掉 hidden 的文章
    const visiblePosts = posts.filter(post => !post.hidden);
    const html = ejs.render(indexTemplate, {
        posts: visiblePosts.map(post => ({
            ...post,
            formattedDate: moment(post.date).format('YYYY / MM / DD')
        }))
    }, ejsOptions) as string;

    console.log(indexTemplate, html);
    
    await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), html);
}

// 复制图片资源
async function copyAssets(post: Post): Promise<void> {
    // 构建源文件目录路径
    const sourcePostDir = path.join(SOURCE_DIR, post.date, post.title);
    
    // 复制文章目录下的图片文件
    const files = await fs.readdir(sourcePostDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    
    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (imageExtensions.includes(ext)) {
            const sourcePath = path.join(sourcePostDir, file);
            const outputPath = path.join(OUTPUT_DIR, 'blog', post.date, post.postPath, file);
            await fs.copy(sourcePath, outputPath);
            console.log(`已复制图片: ${file}`);
        }
    }
}

// 复制 CSS 文件
async function copyStyles(): Promise<void> {
    const stylesPath = path.join(__dirname, 'styles.css');
    const outputStylesPath = path.join(OUTPUT_DIR, 'styles.css');
    if (await fs.pathExists(stylesPath)) {
        await fs.copy(stylesPath, outputStylesPath);
        console.log('CSS 文件已复制到输出目录');
    } else {
        console.warn('警告: styles.css 文件不存在');
    }
}

// 复制构建脚本目录下的资源文件
async function copyBuildAssets(): Promise<void> {
    if (await fs.pathExists(BUILD_ASSETS_DIR)) {
        const assetsFiles = await fs.readdir(BUILD_ASSETS_DIR);
        for (const assetFile of assetsFiles) {
            const sourcePath = path.join(BUILD_ASSETS_DIR, assetFile);
            const outputPath = path.join(OUTPUT_DIR, assetFile);
            await fs.copy(sourcePath, outputPath);
            console.log(`已复制构建资源: ${assetFile}`);
        }
    }
}

// 转换图片路径为绝对路径
function convertImageUrls(content: string, post: Post): string {
    return content.replace(
        /<img[^>]+src="([^"]+)"[^>]*>/g,
        (match, src) => {
            // 如果已经是绝对路径，则不做处理
            if (src.startsWith('http://') || src.startsWith('https://')) {
                return match;
            }
            // 将相对路径转换为绝对路径
            const absoluteUrl = `https://xieguanglei.github.io/blog/${post.date}/${post.postPath}/${src}`;
            return match.replace(src, absoluteUrl);
        }
    );
}

// 生成 RSS Feed
async function generateRssFeed(posts: Post[]): Promise<void> {
    const feed = new RSS({
        title: '一叶斋',
        description: '一叶障目 一叶知秋',
        feed_url: 'https://xieguanglei.github.io/blog/feed.xml',
        site_url: 'https://xieguanglei.github.io',
        language: 'zh-cn',
        pubDate: new Date(),
        copyright: 'All rights reserved'
    });

    // 过滤掉 hidden 的文章，只添加前5篇可见文章
    const visiblePosts = posts.filter(post => !post.hidden).slice(0, 5);
    
    for (const post of visiblePosts) {
        const parsedPost = await postRenderer.parsePost(post);
        
        // 转换文章内容中的图片路径
        const contentWithAbsoluteUrls = convertImageUrls(parsedPost.content || '', post);

        feed.item({
            title: post.title,
            description: contentWithAbsoluteUrls,
            url: `https://xieguanglei.github.io/blog/${post.date}/${post.postPath}`,
            date: moment(post.date).toDate(),
        });
    }

    const xml = feed.xml({ indent: true });
    const outputPath = path.join(OUTPUT_DIR, 'blog', 'feed.xml');
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, xml);
    console.log('RSS Feed 生成完成');
}

// 主函数
async function build(): Promise<void> {
    try {
        console.log('开始构建博客...');
        
        // 清空输出目录
        await fs.emptyDir(OUTPUT_DIR);
        console.log('已清空输出目录');
        
        // 复制构建脚本目录下的资源文件
        await copyBuildAssets();
        console.log('构建资源文件复制完成');
        
        // 扫描并解析文章
        const posts = await scanPosts();
        console.log(`共找到 ${posts.length} 篇文章`);
        
        // 顺序处理每篇文章
        for (const post of posts) {
            try {
                console.log(`\n开始处理文章: ${post.date}/${post.title}`);
                const parsedPost = await postRenderer.parsePost(post);
                
                await generatePostPage(parsedPost);
                console.log('文章页面生成完成');
                
                await copyAssets(parsedPost);
                console.log('文章资源复制完成');
            } catch (err) {
                console.error(`处理文章 ${post.date}/${post.title} 时出错:`, err);
            }
        }
        
        // 生成首页
        await generateIndexPage(posts);
        console.log('首页生成完成');
        
        // 生成 RSS Feed
        await generateRssFeed(posts);
        
        // 复制 CSS 文件
        await copyStyles();
        
        console.log('博客构建完成！');
    } catch (error) {
        console.error('构建失败:', error);
        process.exit(1);
    }
}

build();