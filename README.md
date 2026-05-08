# 任务项运行配置工具 Markdown 数据源原型

这个目录是独立原型：UI 和交互沿用 `任务项运行配置工具.html`，数据读写改为同级 `任务项运行配置工具.md`。

## 启动

```bash
npm start
```

默认地址：

```text
http://localhost:18080/
```

## 数据流

- 页面启动：`GET /api/config-md` 读取同级 Markdown，并解析成页面清册。
- 保存：页面生成 Markdown，`PUT /api/config-md` 原子替换 `任务项运行配置工具.md`。
- 导入：选择 `.md` 文件后提交服务端，替换同级 Markdown。
- 导出：直接下载服务端当前的 `任务项运行配置工具.md`。

## 并发处理

服务端每次读取都会返回 Markdown 的 SHA-256 `version`。保存时页面带上 `baseVersion`：

- 当前文件版本一致：允许保存。
- 当前文件已被别人修改：返回 `409 Conflict`，页面提示刷新后合并。

写入采用临时文件加 `rename` 原子替换。每次替换前会把旧文件备份到 `backups/`。

## Docker

构建镜像：

```bash
docker build -t task-config-md-prototype .
```

运行容器：

```bash
docker run --rm -p 18080:18080 task-config-md-prototype
```

如需把 Markdown 数据持久化到宿主机：

```bash
docker run --rm \
  -p 18080:18080 \
  -v "$PWD/任务项运行配置工具.md:/app/任务项运行配置工具.md" \
  -v "$PWD/backups:/app/backups" \
  task-config-md-prototype
```

## GitHub

这个目录可以作为新的 public GitHub 仓库根目录，默认分支使用 `main`。

GitHub Actions 会在 `main` 分支和 PR 上执行：

- Node 服务语法检查。
- HTML 内嵌脚本语法检查。
- HTTP API 冒烟测试。
- Docker 多架构镜像构建。

`main` 分支 push 时会发布镜像到：

```text
ghcr.io/<owner>/<repo>:latest
ghcr.io/<owner>/<repo>:sha-<commit>
```
