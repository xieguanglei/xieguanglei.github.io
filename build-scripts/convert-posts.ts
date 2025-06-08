import * as fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

const SOURCE_DIR = path.join(__dirname, '..', 'source');
const TARGET_DIR = path.join(__dirname, '..', 'source2');

async function convertPosts() {
    try {
        // 确保目标目录存在
        await fs.ensureDir(TARGET_DIR);
        
        // 读取源目录
        const dirs = await fs.readdir(SOURCE_DIR);
        
        for (const dir of dirs) {
            // 检查目录名是否符合日期格式 (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dir)) {
                console.log('跳过非日期格式目录:', dir);
                continue;
            }
            
            const sourcePostDir = path.join(SOURCE_DIR, dir);
            const targetPostDir = path.join(TARGET_DIR, dir);
            
            try {
                const postDirs = await fs.readdir(sourcePostDir);
                
                for (const postName of postDirs) {
                    const sourcePostPath = path.join(sourcePostDir, postName);
                    const targetPostPath = path.join(targetPostDir, postName);
                    
                    const stat = await fs.stat(sourcePostPath);
                    
                    if (stat.isDirectory()) {
                        const indexMd = path.join(sourcePostPath, 'index.md');
                        const indexYaml = path.join(sourcePostPath, 'index.yaml');
                        
                        if (await fs.pathExists(indexMd) && await fs.pathExists(indexYaml)) {
                            // 读取 YAML 和 Markdown 内容
                            const metaContent = await fs.readFile(indexYaml, 'utf-8');
                            const mdContent = await fs.readFile(indexMd, 'utf-8');
                            
                            // 解析 YAML 并移除指定字段
                            const meta = yaml.load(metaContent) as Record<string, any>;
                            delete meta.mathjax;
                            delete meta.highlight;
                            
                            // 将修改后的元数据转换回 YAML
                            const cleanedMetaContent = yaml.dump(meta);
                            
                            // 创建新的目录
                            await fs.ensureDir(targetPostPath);
                            
                            // 组合新的内容
                            const newContent = `---\n${cleanedMetaContent}---\n\n${mdContent}`;
                            
                            // 写入新的文件
                            await fs.writeFile(path.join(targetPostPath, 'index.md'), newContent);
                            
                            // 复制其他资源文件（如图片等）
                            const files = await fs.readdir(sourcePostPath);
                            for (const file of files) {
                                if (file !== 'index.md' && file !== 'index.yaml') {
                                    await fs.copy(
                                        path.join(sourcePostPath, file),
                                        path.join(targetPostPath, file)
                                    );
                                }
                            }
                            
                            console.log(`已转换文章: ${dir}/${postName}`);
                        }
                    }
                }
            } catch (err) {
                console.error('处理目录时出错:', sourcePostDir, err);
            }
        }
        
        console.log('所有文章转换完成！');
    } catch (error) {
        console.error('转换过程中出错:', error);
        process.exit(1);
    }
}

convertPosts(); 