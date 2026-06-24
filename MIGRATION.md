# 海古纪网站 - 项目迁移指南

> 本文档说明如何将整个项目完整迁移到新的负责人账号下。

---

## 一、GitHub

### 1.1 复制仓库

**方法一：Fork（推荐）**

新负责人用自己的 GitHub 账号打开原仓库：
```
https://github.com/potaser/haiguji-website
```
点击右上角 **Fork** → 选择自己的账号即可。

**方法二：导入新仓库**

1. 登录自己的 GitHub，点右上角 **+** → **Import repository**
2. 填入原仓库 URL：`https://github.com/potaser/haiguji-website`
3. 设置新仓库名称（如 `haiguji-website`），点 **Begin import**

### 1.2 启用 GitHub Pages

1. 进入新仓库 → **Settings** → **Pages**
2. **Branch** 选 `master` → 文件夹选 `/ (root)` → **Save**
3. 等待 1-2 分钟，出现绿色提示：
   ```
   Your site is live at https://新用户名.github.io/haiguji-website/
   ```
   **这个网址就是新网站地址。**

### 1.3 修改 CORS 配置

仓库中的 `api-server.js` 默认 CORS 限制为原域名，新负责人需要将 `api-server.js` 中的 `CORS_ORIGIN` 改为自己的 GitHub Pages 域名：
```
CORS_ORIGIN = 'https://新用户名.github.io'
```
或者在 Render 环境变量中设置 `CORS_ORIGIN`。

> ⚠ 如果不改，浏览器会因跨域限制导致表单提交失败。

---

## 二、Resend（邮件发送）

### 2.1 注册账号

1. 打开 https://resend.com
2. 点击 **Sign Up**，建议用 **Sign in with GitHub**（省事）
3. 注册完成后进入后台

### 2.2 获取 API Key

1. 左侧菜单 → **API Keys**
2. 点击 **Create API Key**
3. 给 key 起个名字（如 `haiguji-contact`），点 **Create**
4. **复制生成的 API Key**（格式如 `re_xxxxxxxxxxxx`）

> ⚠ 这个 Key 只在创建时显示一次，请立刻复制保存。

---

## 三、Render（表单后端）

### 3.1 注册账号

1. 打开 https://render.com
2. 点击 **Sign Up** → **GitHub**（用新负责人的 GitHub 登录）
3. 授权 Render 访问新仓库

### 3.2 部署 Web Service

1. 点击 **New +** → **Web Service**
2. **Connect repository** → 选择刚才 fork/导入的新仓库
3. 填写以下参数：

| 字段 | 值 |
|---|---|
| Name | `haiguji-website` |
| Branch | `master` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `node api-server.js` |
| Plan | **Free** |

4. 点 **Create Web Service**，等待部署完成

### 3.3 配置环境变量

部署完成后，进入 **Dashboard** → 点击 Web Service → **Environment** 选项卡，添加以下变量：

| 变量 | 值 | 说明 |
|---|---|---|
| `RESEND_KEY` | `re_xxxxxxxxxxxx` | Resend API Key |
| `MAIL_TO` | `新负责人邮箱@xxx.com` | 接收表单的邮箱 |
| `CORS_ORIGIN` | `https://新用户名.github.io` | 允许提交表单的网站域名 |
| `SUMMARY_INTERVAL` | `15` | 汇总间隔（分钟），默认15 |

添加完成后，点右侧 **Manual Deploy → Deploy latest commit** 使环境变量生效。

### 3.4 验证部署

部署完成后，查看 **Logs** 应能看到：
```
API server running on port 10000
✅ 有表单提交后 15 分钟发送汇总邮件至 新负责人邮箱@xxx.com
```

**访问网站** `https://新用户名.github.io/haiguji-website/`，提交一次联系表单测试。

---

## 四、整体架构

```
用户访问 ──→ GitHub Pages（展示网页）
                 │
         提交联系表单
                 ↓
        Render（处理表单、存数据）
                 │
          每15分钟汇总
                 ↓
        Resend API（发送邮件）
                 │
                 ↓
        新负责人邮箱收信
```

| 服务 | 用途 | 费用 |
|---|---|---|
| GitHub Pages | 托管网页文件 | 免费 |
| Render | 处理表单提交、定时汇总 | 免费（有冷启动延迟） |
| Resend | 发送邮件通知 | 免费 100封/天 |

---

## 五、常见问题

**Q：Render 免费版会休眠，第一次访问很慢？**
A：是的。自由实例 15 分钟无请求会休眠，首次请求需要等待 30-60 秒唤醒。表单提交不受影响，提交后会继续处理。

**Q：换邮箱需要改代码吗？**
A：不需要。直接在 Render Environment 中修改 `MAIL_TO` 和 `RESEND_KEY` 后重新部署即可。

**Q：怎么查看已提交的表单数据？**
A：Render 工作目录下有 `data/contact-messages.json` 文件，可通过 Render 的 **Shell** 终端查看。

**Q：部署失败怎么办？**
A：检查 Render 的 **Logs** 看具体报错信息。常见原因：
- `npm install` 超时 → 重新部署一次
- 端口冲突 → 无需处理，Render 自动分配 `PORT` 环境变量
