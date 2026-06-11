// ============================================================
// 类型
// ============================================================

export type CommentNode = {
  id: string;
  content: string;
  isApproved: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  replies?: CommentNode[];
};

/**
 * 将扁平评论列表构建为嵌套树结构
 *
 * 算法：
 * 1. 创建 id→comment 映射
 * 2. 遍历所有评论，将子评论挂到父评论的 replies 下
 * 3. 返回顶层评论（parentId === null）
 *
 * @param comments - 扁平评论列表
 * @param maxDepth - 最大嵌套深度（默认 3）
 * @returns 嵌套评论树
 */
export function buildCommentTree(
  comments: CommentNode[],
  maxDepth: number = 3
): CommentNode[] {
  if (!comments.length) return [];

  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // 初始化映射
  for (const comment of comments) {
    map.set(comment.id, { ...comment, replies: [] });
  }

  // 构建树
  for (const comment of comments) {
    const node = map.get(comment.id)!;

    if (comment.parentId && map.has(comment.parentId)) {
      const parent = map.get(comment.parentId)!;
      parent.replies = parent.replies || [];

      // 计算深度
      const depth = getDepth(node, map);
      if (depth <= maxDepth) {
        parent.replies.push(node);
      } else {
        // 超过最大深度，挂到顶层
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // 清理空 replies 数组
  function cleanReplies(nodes: CommentNode[]) {
    for (const node of nodes) {
      if (node.replies && node.replies.length === 0) {
        delete node.replies;
      } else if (node.replies) {
        cleanReplies(node.replies);
      }
    }
  }

  cleanReplies(roots);
  return roots;
}

/**
 * 计算节点的深度（根节点深度为 1）
 */
function getDepth(
  node: CommentNode,
  map: Map<string, CommentNode>
): number {
  let depth = 1;
  let current = node;

  while (current.parentId && map.has(current.parentId)) {
    depth++;
    current = map.get(current.parentId)!;
  }

  return depth;
}
