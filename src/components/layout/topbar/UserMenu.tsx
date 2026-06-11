"use client";

import { useState, useRef, useEffect, memo } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { UserAvatar } from "@/components/user/UserAvatar";

type Props = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  userId?: string;
  isAdmin: boolean;
};

/**
 * 桌面端用户菜单
 *
 *  从 TopHeader 抽出：
 *   1) TopHeader 的 JSX 更紧凑，可读性更高
 *   2) React.memo 包裹：父级 setHidden() 等无关 state 变更不会重渲染头像
 *      这种"展示用的小部件"最适合 memo
 */
function UserMenuImpl({ email, name, image, userId, isAdmin }: Props) {
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
    <div ref={ref} className="vitalog-topbar__user">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="vitalog-topbar__user-trigger"
        aria-label="用户菜单"
        aria-expanded={open}
        data-cursor="hover"
      >
        <UserAvatar
          name={name}
          image={image}
          userId={userId}
          size="sm"
          className="vitalog-topbar__user-avatar"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="vitalog-topbar__user-menu"
            role="menu"
          >
            <div className="vitalog-topbar__user-info">
              <p className="vitalog-topbar__user-name">{name || "用户"}</p>
              <p className="vitalog-topbar__user-email">{email || ""}</p>
            </div>

            <div className="vitalog-topbar__user-list">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="vitalog-topbar__user-item"
                role="menuitem"
              >
                个人中心
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="vitalog-topbar__user-item vitalog-topbar__user-item--accent"
                  role="menuitem"
                >
                  后台管理
                </Link>
              )}
            </div>

            <div className="vitalog-topbar__user-list">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="vitalog-topbar__user-item vitalog-topbar__user-item--danger"
                role="menuitem"
              >
                退出登录
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const UserMenu = memo(UserMenuImpl);
export default UserMenu;
