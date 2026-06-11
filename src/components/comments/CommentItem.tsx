"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CommentForm } from "./CommentForm";
import { UserAvatar } from "@/components/user/UserAvatar";
import type { CommentNode } from "@/lib/comments/buildCommentTree";

type CommentItemProps = {
  comment: CommentNode;
  postId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete?: (commentId: string) => void;
  depth?: number;
};

export function CommentItem({
  comment,
  postId,
  currentUserId,
  isAdmin,
  onDelete,
  depth = 0,
}: CommentItemProps) {
  const router = useRouter();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const isAuthor = currentUserId === comment.author.id;
  const canDelete = isAuthor || isAdmin;
  const canReply = !!currentUserId;
  const maxDepth = 3;

  // Markdown 渲染配置
  const markdownComponents = {
    a: (props: any) => (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 dark:text-primary-400 underline underline-offset-2"
      />
    ),
    code: (props: any) => (
      <code
        {...props}
        className="rounded bg-[rgb(var(--muted))] px-1 py-0.5 font-mono text-xs"
      />
    ),
  };

  async function handleDelete() {
    if (!confirm("确定删除这条评论？所有回复也将被删除。")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsDeleted(true);
        onDelete?.(comment.id);
      }
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  }

  if (isDeleted) {
    return (
      <div className="py-3 pl-4 text-xs text-[rgb(var(--muted-foreground))] italic border-l-2 border-[rgb(var(--border))]">
        评论已删除
      </div>
    );
  }

  const date = new Date(comment.createdAt);

  return (
    <div
      className={`group ${
        depth > 0 ? "border-l-2 border-[rgb(var(--border))] pl-4 ml-4" : ""
      }`}
    >
      <div className="py-3">
        {/* 作者信息 */}
        <div className="flex items-center gap-2.5">
          <UserAvatar
            name={comment.author.name}
            image={comment.author.image}
            userId={comment.author.id}
            size="sm"
            ring
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">
              {comment.author.name || "匿名用户"}
            </span>
            <time
              dateTime={date.toISOString()}
              className="ml-2 text-xs text-[rgb(var(--muted-foreground))]"
            >
              {date.toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              {date.toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        </div>

        {/* 评论内容 */}
        <div className="mt-2 text-sm leading-relaxed prose-custom">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents as any}
          >
            {comment.content}
          </ReactMarkdown>
        </div>

        {/* 操作按钮 */}
        <div className="mt-2 flex items-center gap-3">
          {canReply && depth < maxDepth && (
            <button
              onClick={() => {
                if (!currentUserId) {
                  router.push("/login");
                  return;
                }
                setShowReplyForm(!showReplyForm);
              }}
              className="text-xs font-medium text-[rgb(var(--muted-foreground))] hover:text-amber-bright transition-colors"
            >
              {showReplyForm ? "取消回复" : "回复"}
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs font-medium text-[rgb(var(--muted-foreground))] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              {isDeleting ? "删除中..." : "删除"}
            </button>
          )}
        </div>

        {/* 回复表单 */}
        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              replyTo={comment.author.name || "匿名用户"}
              onSuccess={() => {
                setShowReplyForm(false);
                router.refresh();
              }}
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}
      </div>

      {/* 嵌套回复 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
