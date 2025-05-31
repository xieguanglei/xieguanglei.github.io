import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import moment from 'moment';
import yaml from 'js-yaml';
import ejs from 'ejs';

// 类型定义
interface PostMeta {
    path?: string;
    [key: string]: any;
}

interface Post {
    date: string;
    title: string;
    path: string;
    postPath: string;
    content?: string;
    url?: string;
    formattedDate?: string;
    [key: string]: any;
}

// 配置
const SOURCE_DIR = path.join(__dirname, '..', 'source');
const OUTPUT_DIR = path.join(__dirname, '../dist');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

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

// 扫描文章目录
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
                        const indexYaml = path.join(postPath, 'index.yaml');
                        
                        if (await fs.pathExists(indexMd) && await fs.pathExists(indexYaml)) {
                            const metaContent = await fs.readFile(indexYaml, 'utf-8');
                            const meta = yaml.load(metaContent) as PostMeta;
                            const [date, title] = [dir, postName];
                            posts.push({ date, title, path: postPath, postPath: meta.path || '' });
                            console.log('找到文章:', date, title, meta.path);
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

// 解析文章内容
async function parsePost(post: Post): Promise<Post> {
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
        content: marked.parse(markdown, { async: false }) as string,
        url: `/blog/${post.date}/${post.postPath}/`
    };
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
    const html = ejs.render(indexTemplate, {
        posts: posts.map(post => ({
            ...post,
            formattedDate: moment(post.date).format('YYYY / MM / DD')
        }))
    }, ejsOptions) as string;
    
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
    const buildAssetsDir = path.join(__dirname, 'assets');
    if (await fs.pathExists(buildAssetsDir)) {
        const assetsFiles = await fs.readdir(buildAssetsDir);
        for (const assetFile of assetsFiles) {
            const sourcePath = path.join(buildAssetsDir, assetFile);
            const outputPath = path.join(OUTPUT_DIR, assetFile);
            await fs.copy(sourcePath, outputPath);
            console.log(`已复制构建资源: ${assetFile}`);
        }
    }
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
                const parsedPost = await parsePost(post);
                
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
        
        // 复制 CSS 文件
        await copyStyles();
        
        console.log('博客构建完成！');
    } catch (error) {
        console.error('构建失败:', error);
        process.exit(1);
    }
}

build();