/**
 * 本地 Markdown 文件同步脚本
 *
 * 扫描 local-posts/ 文件夹，将 .md/.mdx 文件同步到数据库。
 *
 * 用法:
 *   npm run sync:md                        # 默认扫描 local-posts/
 *   npm run sync:md -- --path=./my-posts   # 指定路径
 *   npm run sync:md -- --dry               # 预览模式（不实际写入）
 *   npm run sync:md -- --auto-publish      # 自动发布新文章
 *
 * Frontmatter 支持的字段:
 *   title (必填)      - 文章标题
 *   slug (可选)        - URL 标识
 *   tags (可选)        - 标签数组 ['React', 'Next.js']
 *   date (可选)        - 发布日期
 *   excerpt (可选)     - 摘要
 *   coverImage (可选)  - 封面图 URL
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import slugifyLib from "slugify";

// ============================================================
// 配置
// ============================================================

const prisma = new PrismaClient();

// 解析命令行参数
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg?.split("=")[1]?.replace(/^['"]|['"]$/g, "");
};
const hasArg = (name: string): boolean => args.includes(`--${name}`);

const SCAN_DIR = path.resolve(getArg("path") || "local-posts");
const DRY_RUN = hasArg("dry");
const AUTO_PUBLISH = hasArg("auto-publish");

// 管理员的 User ID（从环境变量读取）
const ADMIN_ID =
  process.env.ADMIN_USER_ID ||
  ""; // 如果为空，脚本会尝试自动查找第一个 ADMIN 用户

// ============================================================
// 工具函数
// ============================================================

function slugify(text: string): string {
  return slugifyLib(text, {
    lower: true,
    strict: false,
    trim: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

/**
 * 解析 frontmatter
 */
interface Frontmatter {
  title?: string;
  slug?: string;
  tags?: string[];
  date?: string;
  excerpt?: string;
  coverImage?: string;
  status?: string;
  featured?: boolean;
  [key: string]: any;
}

function parseFrontmatter(
  filePath: string
): { frontmatter: Frontmatter; content: string } | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = matter(raw);
    return {
      frontmatter: parsed.data as Frontmatter,
      content: parsed.content.trim(),
    };
  } catch (err: any) {
    logError(`无法解析文件: ${filePath} — ${err.message}`);
    return null;
  }
}

/**
 * 扫描目录获取所有 .md / .mdx 文件
 */
function scanFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    logError(`目录不存在: ${dir}`);
    return [];
  }

  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanFiles(fullPath));
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * 从文件名生成 slug
 */
function filenameToSlug(filePath: string): string {
  const basename = path.basename(filePath, path.extname(filePath));
  return slugify(basename);
}

// ============================================================
// 日志
// ============================================================

const stats = {
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
};

function logInfo(msg: string) {
  console.log(msg);
}

function logSuccess(msg: string) {
  console.log(`  ✅ ${msg}`);
}

function logSkipped(msg: string) {
  console.log(`  ⏭️  ${msg}`);
}

function logError(msg: string) {
  console.error(`  ❌ ${msg}`);
  stats.errors++;
}

// ============================================================
// 核心逻辑
// ============================================================

async function getAdminUserId(): Promise<string> {
  // 优先使用环境变量
  if (ADMIN_ID) return ADMIN_ID;

  // 自动查找第一个管理员用户
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", deletedAt: null },
    select: { id: true, name: true },
  });

  if (!admin) {
    throw new Error(
      "未找到管理员用户。请先注册一个用户并设置 role=ADMIN，或设置环境变量 ADMIN_USER_ID"
    );
  }

  logInfo(`🔑 自动选择管理员: ${admin.name} (${admin.id})`);
  return admin.id;
}

async function upsertTags(tagNames: string[]): Promise<{ id: string }[]> {
  const tags: { id: string }[] = [];

  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    const tagSlug = slugify(trimmed);

    const tag = await prisma.tag.upsert({
      where: { slug: tagSlug },
      update: {},
      create: { name: trimmed, slug: tagSlug },
      select: { id: true },
    });

    tags.push(tag);
  }

  return tags;
}

async function syncFile(
  filePath: string,
  relativePath: string,
  authorId: string
) {
  const stat = fs.statSync(filePath);
  const parsed = parseFrontmatter(filePath);

  if (!parsed) return;

  const { frontmatter, content } = parsed;

  // ---------- 验证必填字段 ----------
  if (!frontmatter.title) {
    logError(`${relativePath}: 缺少 title 字段`);
    return;
  }

  // ---------- 确定 slug ----------
  const slug =
    frontmatter.slug?.trim() || filenameToSlug(filePath);

  // ---------- 标签 ----------
  const tags: string[] = frontmatter.tags ?? [];

  // ---------- 摘要 ----------
  const excerpt = frontmatter.excerpt || content.slice(0, 200).replace(/\n/g, " ");

  // ---------- 查找数据库中的文章 ----------
  const existing = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      content: true,
      updatedAt: true,
      status: true,
    },
  });

  const fileMtime = stat.mtime;

  if (existing) {
    // 已存在：比较时间，内容变化才更新
    const dbTime = new Date(existing.updatedAt);

    // 如果数据库更新时间晚于文件时间，跳过
    if (dbTime >= fileMtime) {
      logSkipped(
        `${slug}: 数据库版本更新或相同 (${dbTime.toLocaleString("zh-CN")} ≥ ${fileMtime.toLocaleString("zh-CN")})`
      );
      stats.skipped++;
      return;
    }

    // 内容确实变化了才更新
    if (existing.content.trim() === content) {
      logSkipped(`${slug}: 内容未变化`);
      stats.skipped++;
      return;
    }

    if (DRY_RUN) {
      logInfo(`  🔄 [预览] 更新: ${frontmatter.title} (${slug})`);
      stats.updated++;
      return;
    }

    await prisma.post.update({
      where: { id: existing.id },
      data: {
        title: frontmatter.title,
        content,
        excerpt,
        coverImage: frontmatter.coverImage ?? null,
        status: existing.status, // 保持原有状态
        featured: frontmatter.featured ?? false,
      },
    });

    // 更新标签
    await prisma.tagOnPost.deleteMany({ where: { postId: existing.id } });
    const tagRecords = await upsertTags(tags);
    await prisma.tagOnPost.createMany({
      data: tagRecords.map((t) => ({ postId: existing.id, tagId: t.id })),
    });

    logSuccess(
      `更新: ${frontmatter.title} (${slug}) [${existing.status}]`
    );
    stats.updated++;
  } else {
    // 不存在：创建新文章
    if (DRY_RUN) {
      logInfo(`  📝 [预览] 新增: ${frontmatter.title} (${slug})`);
      stats.created++;
      return;
    }

    const status = AUTO_PUBLISH
      ? "PUBLISHED"
      : (frontmatter.status as "DRAFT" | "PUBLISHED") || "DRAFT";

    await prisma.post.create({
      data: {
        title: frontmatter.title,
        slug,
        content,
        excerpt,
        coverImage: frontmatter.coverImage ?? null,
        status,
        featured: frontmatter.featured ?? false,
        authorId,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        tags: {
          create: (await upsertTags(tags)).map((t) => ({ tagId: t.id })),
        },
      },
    });

    logSuccess(`新增: ${frontmatter.title} (${slug}) [${status}]`);
    stats.created++;
  }
}

// ============================================================
// 主函数
// ============================================================

async function main() {
  console.log("\n📂 本地 Markdown 文件同步工具\n");
  console.log(`   扫描目录: ${SCAN_DIR}`);
  if (DRY_RUN) console.log("   模式: 预览（不实际写入）");
  if (AUTO_PUBLISH) console.log("   新文章自动发布");
  console.log("");

  // 获取管理员用户
  const authorId = await getAdminUserId();
  console.log("");

  // 扫描文件
  const files = scanFiles(SCAN_DIR);
  console.log(`🔍 找到 ${files.length} 个文件\n`);

  if (files.length === 0) {
    console.log("没有可同步的文件。请在 local-posts/ 目录下放置 .md 或 .mdx 文件。\n");
    await prisma.$disconnect();
    return;
  }

  // 逐文件同步
  for (const filePath of files) {
    const relativePath = path.relative(SCAN_DIR, filePath);
    console.log(`📄 ${relativePath}`);
    await syncFile(filePath, relativePath, authorId);
  }

  // 汇总
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 同步完成:");
  console.log(`   📝 新增: ${stats.created} 篇`);
  console.log(`   🔄 更新: ${stats.updated} 篇`);
  console.log(`   ⏭️  跳过: ${stats.skipped} 篇`);
  if (stats.errors > 0) console.log(`   ❌ 错误: ${stats.errors} 条`);
  if (DRY_RUN) console.log("\n   ℹ️  预览模式，未实际写入数据库");
  console.log("");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\n❌ 脚本执行失败:", err);
  prisma.$disconnect();
  process.exit(1);
});
