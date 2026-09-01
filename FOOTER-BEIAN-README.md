# 页脚备案信息配置说明

## 配置位置

备案信息配置在 `src/components/layout/Footer.tsx` 文件中，找到以下常量进行修改：

### 1. ICP备案配置
```typescript
// ICP备案配置 - 请替换为真实备案号
const ICP_BEIAN_NUMBER = "粤ICP备XXXXXXXX号"; // 替换为真实ICP备案号
const ICP_BEIAN_URL = "https://beian.miit.gov.cn/";
```

**修改说明：**
- 将 `粤ICP备XXXXXXXX号` 替换为您的真实ICP备案号
- 例如：`粤ICP备12345678号`

### 2. 公安网安备案配置
```typescript
// 公安网安备案配置 - 请替换为真实备案号
const POLICE_BEIAN_NUMBER = "粤公网安备 XXXXXXXXXXXX号"; // 替换为真实公安备案号
const POLICE_BEIAN_URL = "https://beian.mps.gov.cn/#/query/webSearch";
```

**修改说明：**
- 将 `粤公网安备 XXXXXXXXXXXX号` 替换为您的真实公安备案号
- 例如：`粤公网安备 44010602001234号`

### 3. 个人名称配置
在ICP备案行中，找到：
```typescript
<span>© {year} 郑炎生 | ICP备案号：</span>
```
将 `郑炎生` 替换为您的真实姓名或网站名称。

### 4. 公安备案图标
公安备案图标位于 `public/icons/police-icon.svg`

**如需替换为官方图标：**
1. 从全国互联网安全管理服务平台下载官方图标
2. 保存为 `public/icons/police-icon.png`（16x16像素，透明背景）
3. 修改 `Footer.tsx` 中的图标路径：
   ```typescript
   const POLICE_ICON_URL = "/icons/police-icon.png";
   ```

## 显示效果

页脚将显示四行信息：
1. **第一行**：© 2026 生息日志 保留所有权利。· 隐私政策 · GitHub · RSS · 笑声文档工具箱
2. **第二行**：© 2026 郑炎生 | ICP备案号：粤ICP备XXXXXXXX号（可点击跳转工信部）
3. **第三行**：粤公网安备 XXXXXXXXXXXX号（带公安图标，可点击跳转公安网安平台）
4. **第四行**：Powered by 逃之夭夭 & 哔哩哔哩

## 合规要求

✅ ICP备案号可点击跳转工信部官网
✅ 公安备案搭配官方图标+可点击跳转
✅ 放置全站所有页面最底部
✅ 字体清晰可见，颜色#666，字号13px
✅ 移动端自适应，PC端横向排列、手机端自动换行
✅ 个人站点无"经营性、公司、企业"相关字样

## 注意事项

1. 备案号必须真实有效，否则可能被工信部或公安部门查处
2. 跳转链接必须指向官方网站，不能使用第三方查询网站
3. 公安备案图标建议使用官方提供的图标，确保合规
4. 如需调整样式，可修改 `src/app/globals.css` 中的 `.vitalog-footer__line--beian` 相关样式