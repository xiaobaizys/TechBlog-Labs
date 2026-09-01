# TechBlog-Labs 配置说明

## ✅ 已完成的配置

### 1. GitHub OAuth 登录
- **Client ID**: `Ov23liAVBM6yqduYQjUA`
- **Client Secret**: 已配置到 `.env.local`
- **状态**: ✅ 已启用

### 2. 备案信息配置

#### ICP 备案
- **备案号**: 粤ICP备2026072693号-2
- **链接**: https://beian.miit.gov.cn/
- **版权信息**: ©2026 郑炎生

#### 公安网安备案
- **备案号**: 粤公网安备 XXXXXXXXXXXX号（待填写）
- **链接**: https://beian.mps.gov.cn/#/query/webSearch
- **状态**: ⏳ 预留（等待公安备案号）

### 3. 公安备案图标
- **图标路径**: `/icons/police-icon.svg`
- **状态**: ✅ 已配置（16x16 蓝色警徽图标）

## 📋 环境变量配置

### `.env.local` 文件
```env
AUTH_GITHUB_ID="Ov23liAVBM6yqduYQjUA"
AUTH_GITHUB_SECRET="3db5b2b7e38fe0b73a4141752c2bb1376e62f0d8"
```

## 🚀 启动服务

```bash
npm run dev
```

## 🔗 访问地址

- **本地开发**: http://localhost:3000/login
- **域名访问**: http://www.zysoo.top/login
- **IP 访问**: http://117.72.12.223/login

## 📝 GitHub OAuth App 配置

### 回调 URL 配置
确保 GitHub OAuth App 的 **Authorization callback URL** 设置为：
- 域名访问：`http://www.zysoo.top/api/auth/callback/github`
- IP 访问：`http://117.72.12.223/api/auth/callback/github`

## 🎯 下一步

1. ✅ GitHub 登录已配置完成
2. ⏳ 等待公安备案号填写
3. ✅ 备案信息已更新到页面底部

## 📞 联系方式

如有问题，请联系管理员或查看项目文档。
