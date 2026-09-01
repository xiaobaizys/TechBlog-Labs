"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  ExternalLink,
  Globe,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Link as LinkIcon,
} from "lucide-react";

// ============================================================
// 类型定义
// ============================================================

interface FriendLink {
  id: string;
  name: string;
  url: string;
  avatar: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FriendLinkApplication {
  id: string;
  name: string;
  url: string;
  avatar: string | null;
  description: string | null;
  category: string | null;
  contact: string | null;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  url: string;
  avatar: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

// 初始表单数据
const initialFormData: FormData = {
  name: "",
  url: "",
  avatar: "",
  description: "",
  sortOrder: 0,
  isActive: true,
};

export default function AdminFriendsPage() {
  const router = useRouter();

  // Tab 状态
  const [activeTab, setActiveTab] = useState<"links" | "applications">("links");

  // 友链管理状态
  const [links, setLinks] = useState<FriendLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  // 申请审核状态
  const [applications, setApplications] = useState<FriendLinkApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appFilter, setAppFilter] = useState<string>("PENDING");
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // 消息提示
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ============================================================
  // 数据加载
  // ============================================================

  useEffect(() => {
    fetchLinks();
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [appFilter]);

  const fetchLinks = async () => {
    try {
      setLinksLoading(true);
      const response = await fetch("/api/friends");
      if (response.ok) {
        const data = await response.json();
        setLinks(data.data || []);
      }
    } catch (error) {
      console.error("获取友情链接失败:", error);
    } finally {
      setLinksLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setAppsLoading(true);
      const response = await fetch(
        `/api/admin/friends/applications?status=${appFilter}`
      );
      if (response.ok) {
        const data = await response.json();
        setApplications(data.data || []);
      }
    } catch (error) {
      console.error("获取申请列表失败:", error);
    } finally {
      setAppsLoading(false);
    }
  };

  // ============================================================
  // 消息提示
  // ============================================================

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // ============================================================
  // 友链管理操作
  // ============================================================

  const handleCreate = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setShowForm(true);
  };

  const handleEdit = (link: FriendLink) => {
    setEditingId(link.id);
    setFormData({
      name: link.name,
      url: link.url,
      avatar: link.avatar || "",
      description: link.description || "",
      sortOrder: link.sortOrder,
      isActive: link.isActive,
    });
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.url) {
      showMessage("error", "名称和链接不能为空");
      return;
    }

    try {
      setSaving(true);
      const url = editingId ? `/api/friends/${editingId}` : "/api/friends";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showMessage(
          "success",
          editingId ? "友情链接更新成功" : "友情链接创建成功"
        );
        handleClose();
        fetchLinks();
      } else {
        const data = await response.json();
        showMessage("error", data.message || "保存失败");
      }
    } catch (error) {
      showMessage("error", "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个友情链接吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/friends/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showMessage("success", "友情链接删除成功");
        fetchLinks();
      } else {
        const data = await response.json();
        showMessage("error", data.message || "删除失败");
      }
    } catch (error) {
      showMessage("error", "删除失败");
    }
  };

  const toggleActive = async (link: FriendLink) => {
    try {
      const response = await fetch(`/api/friends/${link.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...link,
          isActive: !link.isActive,
        }),
      });

      if (response.ok) {
        showMessage(
          "success",
          `友情链接已${link.isActive ? "禁用" : "启用"}`
        );
        fetchLinks();
      }
    } catch (error) {
      showMessage("error", "操作失败");
    }
  };

  // ============================================================
  // 申请审核操作
  // ============================================================

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/friends/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (response.ok) {
        showMessage("success", "申请已批准，友链已添加");
        setAppFilter("APPROVED"); // 切换到"已通过"让用户看到结果
        fetchLinks(); // 刷新友链列表
      } else {
        const data = await response.json();
        if (data.message === "该申请已处理") {
          showMessage("success", "该申请已批准过了");
          setAppFilter("APPROVED");
        } else {
          showMessage("error", data.message || "操作失败");
        }
      }
    } catch (error) {
      showMessage("error", "操作失败");
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;

    try {
      const response = await fetch(
        `/api/admin/friends/applications/${rejectModal.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            rejectReason: rejectReason || "不符合要求",
          }),
        }
      );

      if (response.ok) {
        showMessage("success", "申请已拒绝");
        setRejectModal(null);
        setRejectReason("");
        setAppFilter("REJECTED"); // 切换到"已拒绝"让用户看到结果
      } else {
        const data = await response.json();
        showMessage("error", data.message || "操作失败");
      }
    } catch (error) {
      showMessage("error", "操作失败");
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm("确定要删除这个申请吗？")) return;

    try {
      const response = await fetch(`/api/admin/friends/applications/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showMessage("success", "申请已删除");
        fetchApplications();
      } else {
        const data = await response.json();
        showMessage("error", data.message || "删除失败");
      }
    } catch (error) {
      showMessage("error", "删除失败");
    }
  };

  // ============================================================
  // 辅助函数
  // ============================================================

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-amber" />;
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "待审核";
      case "APPROVED":
        return "已通过";
      case "REJECTED":
        return "已拒绝";
      default:
        return status;
    }
  };

  // 统计待审核数量
  const pendingCount = applications.filter(
    (app) => app.status === "PENDING"
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          友情链接管理
        </h1>
        <p className="mt-2 text-[rgb(var(--muted-foreground))]">
          管理友情链接和审核用户申请
        </p>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="mb-6 flex gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--muted))] p-1 w-fit">
        <button
          onClick={() => setActiveTab("links")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "links"
              ? "bg-[rgb(var(--card))] text-[rgb(var(--foreground))] shadow-sm"
              : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          友情链接
          <span className="rounded-full bg-[rgb(var(--muted))] px-2 py-0.5 text-xs">
            {links.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("applications")}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "applications"
              ? "bg-[rgb(var(--card))] text-[rgb(var(--foreground))] shadow-sm"
              : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          申请审核
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber px-2 py-0.5 text-xs text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================
       *  友情链接管理 Tab
       * ============================================================ */}
      {activeTab === "links" && (
        <>
          {/* 操作栏 */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-[rgb(var(--muted-foreground))]">
              共 {links.length} 个友情链接
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-amber px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-bright"
            >
              <Plus className="h-4 w-4" />
              添加友链
            </button>
          </div>

          {/* 友链列表 */}
          {linksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber" />
              <span className="ml-3 text-[rgb(var(--muted-foreground))]">
                加载中...
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
              {/* 表头 */}
              <div className="grid grid-cols-12 gap-4 border-b border-[rgb(var(--border))] p-4 text-sm font-medium text-[rgb(var(--muted-foreground))]">
                <div className="col-span-3">名称</div>
                <div className="col-span-3">链接</div>
                <div className="col-span-2">描述</div>
                <div className="col-span-1">排序</div>
                <div className="col-span-1">状态</div>
                <div className="col-span-2">操作</div>
              </div>

              {/* 列表内容 */}
              {links.length > 0 ? (
                links.map((link) => (
                  <div
                    key={link.id}
                    className="grid grid-cols-12 items-center gap-4 border-b border-[rgb(var(--border))] p-4 last:border-b-0"
                  >
                    {/* 名称 */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))]">
                        {link.avatar ? (
                          <img
                            src={link.avatar}
                            alt={link.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Globe className="h-5 w-5 text-[rgb(var(--muted-foreground))]" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{link.name}</span>
                    </div>

                    {/* 链接 */}
                    <div className="col-span-3">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-amber-bright hover:underline"
                      >
                        <span className="truncate max-w-[200px]">
                          {link.url}
                        </span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>

                    {/* 描述 */}
                    <div className="col-span-2">
                      <p className="truncate text-sm text-[rgb(var(--muted-foreground))]">
                        {link.description || "-"}
                      </p>
                    </div>

                    {/* 排序 */}
                    <div className="col-span-1">
                      <span className="text-sm">{link.sortOrder}</span>
                    </div>

                    {/* 状态 */}
                    <div className="col-span-1">
                      <button
                        onClick={() => toggleActive(link)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          link.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {link.isActive ? "启用" : "禁用"}
                      </button>
                    </div>

                    {/* 操作 */}
                    <div className="col-span-2 flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(link)}
                        className="rounded-lg border border-[rgb(var(--border))] p-2 text-[rgb(var(--muted-foreground))] transition-colors hover:border-amber hover:text-amber-bright"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="rounded-lg border border-[rgb(var(--border))] p-2 text-[rgb(var(--muted-foreground))] transition-colors hover:border-red-500 hover:text-red-500"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-[rgb(var(--muted-foreground))]">
                  暂无友情链接，点击"添加友链"按钮添加
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============================================================
       *  申请审核 Tab
       * ============================================================ */}
      {activeTab === "applications" && (
        <>
          {/* 筛选按钮 */}
          <div className="mb-6 flex gap-2">
            {["PENDING", "APPROVED", "REJECTED", "all"].map((status) => (
              <button
                key={status}
                onClick={() => setAppFilter(status)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  appFilter === status
                    ? "bg-amber text-white"
                    : "bg-[rgb(var(--muted))] hover:bg-amber/20"
                }`}
              >
                {status === "PENDING" && "待审核"}
                {status === "APPROVED" && "已通过"}
                {status === "REJECTED" && "已拒绝"}
                {status === "all" && "全部"}
              </button>
            ))}
          </div>

          {/* 申请列表 */}
          {appsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber" />
              <span className="ml-3 text-[rgb(var(--muted-foreground))]">
                加载中...
              </span>
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[rgb(var(--border))] p-12 text-center">
              <Globe className="mx-auto mb-4 h-12 w-12 text-[rgb(var(--muted-foreground))]" />
              <h3 className="mb-2 text-lg font-medium">暂无申请</h3>
              <p className="text-[rgb(var(--muted-foreground))]">
                {appFilter === "PENDING"
                  ? "没有待审核的申请"
                  : `没有${getStatusText(appFilter)}的申请`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {/* 申请信息 */}
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        {/* 头像 */}
                        <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--muted))]">
                          {app.avatar ? (
                            <img
                              src={app.avatar}
                              alt={app.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Globe className="h-6 w-6 text-[rgb(var(--muted-foreground))]" />
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="font-medium">{app.name}</h3>
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-amber-bright hover:underline"
                          >
                            {app.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      {/* 描述 */}
                      {app.description && (
                        <p className="mb-2 text-sm text-[rgb(var(--muted-foreground))]">
                          {app.description}
                        </p>
                      )}

                      {/* 元信息 */}
                      <div className="flex flex-wrap gap-4 text-xs text-[rgb(var(--muted-foreground))]">
                        {app.category && (
                          <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">
                            {app.category}
                          </span>
                        )}
                        {app.contact && (
                          <span>联系方式: {app.contact}</span>
                        )}
                        {app.message && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            留言: {app.message}
                          </span>
                        )}
                        <span>
                          提交时间:{" "}
                          {new Date(app.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </div>

                      {/* 拒绝原因 */}
                      {app.status === "REJECTED" && app.rejectReason && (
                        <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-600">
                          拒绝原因: {app.rejectReason}
                        </div>
                      )}
                    </div>

                    {/* 状态和操作 */}
                    <div className="flex flex-col items-end gap-3">
                      {/* 状态 */}
                      <div className="flex items-center gap-2">
                        {getStatusIcon(app.status)}
                        <span className="text-sm font-medium">
                          {getStatusText(app.status)}
                        </span>
                      </div>

                      {/* 操作按钮 */}
                      {app.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(app.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                          >
                            <Check className="h-4 w-4" />
                            批准
                          </button>
                          <button
                            onClick={() => {
                              setRejectModal({ id: app.id, name: app.name });
                              setRejectReason("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                            拒绝
                          </button>
                        </div>
                      )}

                      {/* 删除按钮 */}
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--border))] px-3 py-2 text-sm text-[rgb(var(--muted-foreground))] transition-colors hover:border-red-500 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ============================================================
       *  友链编辑弹窗
       * ============================================================ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? "编辑友情链接" : "添加友情链接"}
              </h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1.5 text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 名称 */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  网站名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                  placeholder="输入网站名称"
                />
              </div>

              {/* 链接 */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  网站链接 <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                  placeholder="https://example.com"
                />
              </div>

              {/* 头像 */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  头像/Logo URL
                </label>
                <input
                  type="url"
                  value={formData.avatar}
                  onChange={(e) =>
                    setFormData({ ...formData, avatar: e.target.value })
                  }
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                  placeholder="https://example.com/avatar.png"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  网站描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                  placeholder="简短描述网站内容"
                />
              </div>

              {/* 排序 */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  排序权重
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                  数值越小越靠前
                </p>
              </div>

              {/* 是否启用 */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-[rgb(var(--border))] text-amber focus:ring-amber"
                />
                <label htmlFor="isActive" className="text-sm font-medium">
                  启用
                </label>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="rounded-lg border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))]"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-amber px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-bright disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
       *  拒绝原因弹窗
       * ============================================================ */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
            <h3 className="mb-4 text-lg font-medium">
              拒绝申请: {rejectModal.name}
            </h3>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">
                拒绝原因
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-4 py-2.5 text-sm focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
                placeholder="请输入拒绝原因（可选）"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                className="rounded-lg border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-medium text-[rgb(var(--muted-foreground))] transition-colors hover:bg-[rgb(var(--muted))]"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}