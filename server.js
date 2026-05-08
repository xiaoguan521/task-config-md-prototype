const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
const mdFileName = "任务项运行配置工具.md";
const htmlFileName = "任务项运行配置工具.html";
const mdFilePath = path.join(rootDir, mdFileName);
const backupDir = path.join(rootDir, "backups");
const port = Number(process.env.PORT || 18080);

function hashContent(content) {
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function send(res, statusCode, body, headers) {
    res.writeHead(statusCode, Object.assign({
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
    }, headers || {}));
    res.end(body);
}

function sendJson(res, statusCode, payload) {
    send(res, statusCode, JSON.stringify(payload), {
        "Content-Type": "application/json; charset=utf-8"
    });
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch (err) {
        return false;
    }
}

async function readMarkdownState() {
    const exists = await fileExists(mdFilePath);
    if (!exists) {
        return {
            content: "",
            version: "",
            updatedAt: null,
            exists: false
        };
    }

    const [content, stat] = await Promise.all([
        fs.readFile(mdFilePath, "utf8"),
        fs.stat(mdFilePath)
    ]);

    return {
        content,
        version: hashContent(content),
        updatedAt: stat.mtime.toISOString(),
        exists: true
    };
}

async function readRequestBody(req) {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        total += chunk.length;
        if (total > 20 * 1024 * 1024) {
            const err = new Error("请求体过大");
            err.status = 413;
            throw err;
        }
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
}

function timestamp() {
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function backupCurrentMarkdown(currentContent) {
    if (!currentContent) {
        return null;
    }
    await fs.mkdir(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `任务项运行配置工具_${timestamp()}.md`);
    await fs.writeFile(backupPath, currentContent, "utf8");
    return backupPath;
}

async function writeMarkdownAtomically(content, baseVersion) {
    const current = await readMarkdownState();
    if (baseVersion && current.version && baseVersion !== current.version) {
        const err = new Error("Markdown 文件已被其他会话修改");
        err.status = 409;
        err.currentVersion = current.version;
        err.updatedAt = current.updatedAt;
        throw err;
    }

    const normalizedContent = String(content || "").replace(/\r\n/g, "\n");
    const tmpPath = mdFilePath + "." + process.pid + "." + Date.now() + ".tmp";

    await backupCurrentMarkdown(current.content);
    await fs.writeFile(tmpPath, normalizedContent, "utf8");
    await fs.rename(tmpPath, mdFilePath);

    const next = await readMarkdownState();
    return {
        version: next.version,
        updatedAt: next.updatedAt,
        path: mdFileName
    };
}

async function handleApi(req, res, pathname) {
    if (pathname === "/api/config-md" && req.method === "GET") {
        const state = await readMarkdownState();
        sendJson(res, 200, Object.assign({ path: mdFileName }, state));
        return true;
    }

    if (pathname === "/api/config-md/export" && req.method === "GET") {
        const state = await readMarkdownState();
        send(res, 200, state.content, {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(mdFileName)}`
        });
        return true;
    }

    if (pathname === "/api/config-md" && (req.method === "PUT" || req.method === "POST")) {
        const rawBody = await readRequestBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const result = await writeMarkdownAtomically(body.content || "", body.baseVersion || "");
        sendJson(res, 200, result);
        return true;
    }

    return false;
}

function getContentType(filePath) {
    if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
    if (filePath.endsWith(".md")) return "text/markdown; charset=utf-8";
    if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
    if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
    return "application/octet-stream";
}

async function serveStatic(res, pathname) {
    const requested = pathname === "/" ? "/" + htmlFileName : pathname;
    const decodedPath = decodeURIComponent(requested);
    const filePath = path.normalize(path.join(rootDir, decodedPath));

    if (!filePath.startsWith(rootDir + path.sep)) {
        send(res, 403, "Forbidden");
        return;
    }

    try {
        const content = await fs.readFile(filePath);
        send(res, 200, content, {
            "Content-Type": getContentType(filePath)
        });
    } catch (err) {
        send(res, 404, "Not found");
    }
}

const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    try {
        const handled = await handleApi(req, res, requestUrl.pathname);
        if (handled) {
            return;
        }
        if (req.method !== "GET" && req.method !== "HEAD") {
            send(res, 405, "Method not allowed");
            return;
        }
        await serveStatic(res, requestUrl.pathname);
    } catch (err) {
        if (err && err.status === 409) {
            sendJson(res, 409, {
                message: err.message,
                currentVersion: err.currentVersion,
                updatedAt: err.updatedAt
            });
            return;
        }
        if (err && err.status === 413) {
            sendJson(res, 413, { message: err.message });
            return;
        }
        console.error(err);
        sendJson(res, 500, { message: err && err.message ? err.message : "Server error" });
    }
});

server.listen(port, () => {
    console.log(`Task config Markdown prototype: http://localhost:${port}/`);
    console.log(`Markdown data file: ${mdFilePath}`);
});
