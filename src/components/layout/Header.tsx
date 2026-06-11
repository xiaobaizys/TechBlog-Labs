"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Menu, X, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { UserAvatar } from "@/components/user/UserAvatar";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/blog", label: "博客" },
  { href: "/projects", label: "项目" },
  { href: "/life", label: "生活" },
  { href: "/about", label: "关于" },
] as const;

/**
 * 站点 Logo 组件
 * 太阳/星形图标 + VitaLog 字样
 */
function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 group"
      aria-label="VitaLog 主页"
    >
      {/* Logo 图标：星芒/太阳 */}
      <span className="relative flex h-8 w-8 items-center justify-center">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="h-7 w-7 text-amber transition-transform duration-500 group-hover:rotate-45"
          aria-hidden="true"
        >
          <circle cx="16" cy="16" r="3" fill="currentColor" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="16"
              y1="4"
              x2="16"
              y2="9"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              transform={`rotate(${deg} 16 16)`}
            />
          ))}
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight text-foreground font-serif">
        VitaLog
      </span>
    </Link>
  );
}

/**
 * 主题切换按钮（sun/moon 旋转动画）
 */
function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <button
        aria-label="切换主题"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/40 text-muted-foreground"
      />
    );
  }
  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="切换主题"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/40 text-muted-foreground hover:text-amber hover:border-amber/50 transition-colors"
    >
      <Sun
        className={`h-4 w-4 absolute transition-all duration-500 ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`h-4 w-4 absolute transition-all duration-500 ${
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}

/**
 * 用户头像下拉菜单
 */
function UserMenu({
  email,
  name,
  image,
  userId,
  isAdmin,
  onSignOut,
}: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  userId?: string;
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-card/60"
        aria-label="用户菜单"
      >
        <UserAvatar
          name={name}
          image={image}
          userId={userId}
          size="sm"
          ring
        />
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card/95 backdrop-blur-lg py-1 shadow-soft-lg"
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium truncate text-foreground">
                {name || "用户"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{email || ""}</p>
            </div>

            <div className="py-1">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4" />
                个人中心
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-amber-bright hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  后台管理
                </Link>
              )}
            </div>

            <div className="border-t border-border py-1">
              <button
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuth = status === "authenticated";
  const isLoading = status === "loading";
  const isAdmin = session?.user?.role === "ADMIN";

  async function handleSignOut() {
    setMobileOpen(false);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Logo />

        {/* 桌面端导航 */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link-ghost">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {isLoading && (
            <div className="hidden md:flex h-9 w-9 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-amber" />
            </div>
          )}

          {!isLoading && !isAuth && (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-amber px-4 py-2 text-sm font-medium text-night shadow-amber hover:shadow-amber-hover hover:scale-[1.03] active:scale-[0.97] transition-all"
              >
                注册
              </Link>
            </div>
          )}

          {!isLoading && isAuth && (
            <UserMenu
              email={session?.user?.email}
              name={session?.user?.name}
              image={session?.user?.image}
              userId={session?.user?.id}
              isAdmin={isAdmin}
              onSignOut={handleSignOut}
            />
          )}

          {/* 移动端汉堡按钮 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/40 md:hidden"
            aria-label="菜单"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden overflow-hidden"
          >
            <nav className="flex flex-col px-4 py-4 gap-1">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}

              <div className="my-2 h-px bg-border" />

              {isLoading && (
                <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-amber" />
                  加载中...
                </div>
              )}

              {!isLoading && !isAuth && (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-amber-bright hover:bg-amber/10 transition-colors"
                  >
                    注册
                  </Link>
                </>
              )}

              {!isLoading && isAuth && (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    个人中心
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-amber-bright hover:bg-amber/10 transition-colors"
                    >
                      后台管理
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    退出登录
                  </button>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Header;
