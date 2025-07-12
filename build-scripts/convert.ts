// 读取 source 目录下的每一篇文章，基于文章的标题使用拼音重新生成 path
// 比如「编程随笔」的 path 应该是 bian-cheng-sui-bi
// 并将其写入到 md 头部的元信息中

import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import pinyin from 'pinyin';

// 将中文标题转换为拼音路径
function titleToPath(title: string): string {
  // 使用 pinyin 库将中文转换为拼音
  const pinyinArray = pinyin(title, {
    style: pinyin.STYLE_NORMAL, // 不带声调
    heteronym: false // 不启用多音字
  });

  // 将拼音数组转换为字符串，用连字符连接
  const pinyinString = pinyinArray
    .flat()
    .filter(Boolean)
    .join('-')
    .toLowerCase();

  // 移除特殊字符，只保留字母、数字和连字符
  const a = pinyinString.replace(/[^a-z0-9-]/g, '');

  if (a.endsWith('-')) {
    return a.substring(0, a.length - 1);
  } else {
    return a;
  }
}

// 处理单个 markdown 文件
async function processMarkdownFile(filePath: string): Promise<void> {
  try {
    // 读取文件内容
    const content = await fs.readFile(filePath, 'utf-8');

    // 解析 front matter
    const { data, content: markdownContent } = matter(content);

    // 从目录名获取标题（去掉日期前缀）
    const dirName = path.basename(path.dirname(filePath));
    const title = dirName.replace(/^\d{4}-\d{2}-\d{2}-/, '');

    // 生成新的路径
    const newPath = titleToPath(title);

    // // 如果路径没有变化，跳过
    // if (data.path === newPath) {
    //   console.log(`跳过 ${filePath}，路径未变化: ${newPath}`);
    //   return;
    // }

    // 更新 front matter 中的 path
    data.path = newPath;

    // 重新组合文件内容
    const updatedContent = matter.stringify(markdownContent, data);

    // 写回文件
    await fs.writeFile(filePath, updatedContent, 'utf-8');

    console.log(`更新 ${filePath}: ${data.path || '无'} -> ${newPath}`);
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error);
  }
}

// 递归遍历目录，找到所有 markdown 文件
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        // 递归处理子目录
        const subFiles = await findMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (item === 'index.md') {
        // 只处理 index.md 文件
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`读取目录 ${dir} 时出错:`, error);
  }

  return files;
}

// 主函数
async function main(): Promise<void> {
  const sourceDir = path.join(__dirname, '..', 'source');

  try {
    // 检查 source 目录是否存在
    if (!await fs.pathExists(sourceDir)) {
      console.error(`Source 目录不存在: ${sourceDir}`);
      return;
    }

    console.log('开始处理 markdown 文件...');

    // 找到所有 markdown 文件
    const markdownFiles = await findMarkdownFiles(sourceDir);

    if (markdownFiles.length === 0) {
      console.log('未找到任何 markdown 文件');
      return;
    }

    console.log(`找到 ${markdownFiles.length} 个 markdown 文件`);

    // 处理每个文件
    for (const file of markdownFiles) {
      await processMarkdownFile(file);
    }

    console.log('处理完成！');
  } catch (error) {
    console.error('处理过程中出错:', error);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}