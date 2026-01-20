# 变更日志

本文档记录 Hexo 博客管理器的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 计划中

- 图片上传功能
- 标签和分类管理
- 草稿箱
- 多仓库支持
- 主题文件编辑
- AI 辅助写作
- SEO 优化建议

## [1.0.0] - 2024-01-18

### 新增

- ✨ GitHub OAuth 2.0 认证
- ✨ 文章管理（创建、编辑、删除）
- ✨ Markdown 编辑器（基于 CodeMirror 6）
- ✨ 实时预览（基于 marked.js）
- ✨ 自动保存到本地
- ✨ 手动保存到 GitHub
- ✨ 草稿恢复功能
- ✨ Hexo front-matter 自动生成
- ✨ 文件名格式化（title.md）
- ✨ 响应式设计（移动端友好）
- ✨ 仓库配置管理
- ✨ 文章列表和搜索
- ✨ 用户会话管理
- ✨ 键盘快捷键支持

### 技术栈

- **后端**: Cloudflare Workers + TypeScript
- **前端**: Svelte 5 + Tailwind CSS
- **编辑器**: CodeMirror 6
- **预览**: marked.js
- **存储**: Cloudflare KV（会话）+ localStorage（草稿）
- **认证**: GitHub OAuth 2.0
- **API**: GitHub REST API

### 功能特性

- 🔐 安全的 GitHub OAuth 认证
- 📝 强大的 Markdown 编辑器
- 👁 实时预览渲染
- 💾 自动保存和草稿恢复
- 🚀 全球边缘计算（Cloudflare Workers）
- 📱 移动端优化
- 🎨 现代化 UI 设计
- ⚡ 快速响应
- 🔧 Hexo 深度集成

### 文档

- 📖 完整的 README
- 📚 详细的部署指南
- 📖 使用说明文档
- 🏗️ 技术方案文档

### 部署

- 🌐 Cloudflare Workers 部署
- 🔄 一键部署脚本
- ⚙️ 环境变量配置
- 🔐 密钥管理

## [0.1.0] - 初始版本

### 项目初始化

- 🎉 项目结构创建
- 📦 依赖配置
- 🔧 开发环境设置
- 📝 文档框架搭建

---

## 版本说明

### 主版本号（Major）

不兼容的 API 修改

### 次版本号（Minor）

向下兼容的功能性新增

### 修订号（Patch）

向下兼容的问题修正

## 贡献指南

欢迎贡献！请查看：

1. [技术方案](./plans/hexo-blog-manager-plan.md)
2. [部署文档](./docs/DEPLOYMENT.md)
3. [使用说明](./docs/USAGE.md)

## 支持

如有问题或建议，请：

1. 提交 [GitHub Issue](https://github.com/your-repo/issues)
2. 查看 [文档](./README.md)
3. 联系维护者

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
