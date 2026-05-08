#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const filePath = process.argv[2] || "任务项运行配置工具.md";
const absolutePath = path.resolve(process.cwd(), filePath);
const content = fs.readFileSync(absolutePath, "utf8");
const lines = content.split(/\r?\n/);

const errors = [];
let currentNode = "";
let currentElement = "";
let currentHeader = null;
let currentPrimaryNo = null;
let expectedPrimaryNo = 1;
let expectedParamNo = 1;
let lastPrimaryHasParams = false;
let lastPrimaryLine = 0;

function splitRow(line) {
    const cells = [];
    let current = "";
    let escaped = false;
    const start = line.startsWith("|") ? 1 : 0;
    const end = line.endsWith("|") ? line.length - 1 : line.length;

    for (let i = start; i < end; i += 1) {
        const char = line[i];
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === "\\") {
            escaped = true;
            continue;
        }
        if (char === "|") {
            cells.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }
    cells.push(current.trim());
    return cells;
}

function location(lineNumber) {
    return `${absolutePath}:${lineNumber}`;
}

function pushError(lineNumber, message) {
    errors.push(`${location(lineNumber)} ${message}`);
}

function isSeparator(cells) {
    return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function finishPrimaryIfNeeded(lineNumber) {
    if (lastPrimaryHasParams) {
        pushError(lastPrimaryLine, "主行配置参数为“见下级参数”，但后面没有二级参数行。");
        lastPrimaryHasParams = false;
    }
}

for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index];

    if (/^（[一二三四五六七八九十]+）\s*/.test(line)) {
        finishPrimaryIfNeeded(lineNumber);
        currentNode = line.replace(/^（[一二三四五六七八九十]+）\s*/, "").trim();
        currentElement = "";
        currentHeader = null;
        currentPrimaryNo = null;
        expectedPrimaryNo = 1;
        expectedParamNo = 1;
        continue;
    }

    if (/^\d+、/.test(line)) {
        finishPrimaryIfNeeded(lineNumber);
        currentElement = line.replace(/^\d+、/, "").replace(/：\s*$/, "").trim();
        currentHeader = null;
        currentPrimaryNo = null;
        expectedPrimaryNo = 1;
        expectedParamNo = 1;
        continue;
    }

    if (!line.startsWith("|")) {
        continue;
    }

    const cells = splitRow(line);
    if (cells[0] === "序号") {
        finishPrimaryIfNeeded(lineNumber);
        currentHeader = cells;
        currentPrimaryNo = null;
        expectedPrimaryNo = 1;
        expectedParamNo = 1;
        if (!currentNode || !currentElement) {
            pushError(lineNumber, "表格必须位于节点标题和要素标题之后。");
        }
        if (!cells.includes("是否应用")) {
            pushError(lineNumber, "表头缺少“是否应用”列。");
        }
        continue;
    }

    if (!currentHeader || isSeparator(cells)) {
        continue;
    }

    if (cells.length !== currentHeader.length) {
        pushError(lineNumber, `列数不匹配：表头 ${currentHeader.length} 列，当前行 ${cells.length} 列。`);
        continue;
    }

    const rowNo = cells[0];
    const statusIndex = currentHeader.indexOf("是否应用");
    const configIndex = currentHeader.indexOf("配置参数");
    const isParamRow = /^\d+\.\d+$/.test(rowNo);

    if (isParamRow) {
        if (!currentPrimaryNo) {
            pushError(lineNumber, "二级参数行前面没有主行。");
            continue;
        }
        const [primaryPart, paramPart] = rowNo.split(".").map(Number);
        if (primaryPart !== currentPrimaryNo) {
            pushError(lineNumber, `二级参数行归属错误：当前主行是 ${currentPrimaryNo}，但参数行是 ${rowNo}。`);
        }
        if (paramPart !== expectedParamNo) {
            pushError(lineNumber, `二级参数序号应为 ${currentPrimaryNo}.${expectedParamNo}。`);
        }
        if (configIndex === -1) {
            pushError(lineNumber, "没有“配置参数”列的内容表不应包含二级参数行。");
        } else if (!/^业务标准值[：:]/.test(cells[configIndex] || "")) {
            pushError(lineNumber, "二级参数行的配置参数列应以“业务标准值：”开头。");
        }
        lastPrimaryHasParams = false;
        expectedParamNo += 1;
        continue;
    }

    finishPrimaryIfNeeded(lineNumber);
    const primaryNo = Number(rowNo);
    if (!Number.isInteger(primaryNo) || primaryNo <= 0) {
        pushError(lineNumber, "主行序号必须是正整数。");
        continue;
    }
    if (primaryNo !== expectedPrimaryNo) {
        pushError(lineNumber, `主行序号应为 ${expectedPrimaryNo}。`);
    }

    const status = cells[statusIndex];
    if (status !== "是" && status !== "否") {
        pushError(lineNumber, "“是否应用”列只能填写“是”或“否”。");
    }

    currentPrimaryNo = primaryNo;
    expectedPrimaryNo = primaryNo + 1;
    expectedParamNo = 1;
    lastPrimaryLine = lineNumber;
    lastPrimaryHasParams = configIndex !== -1 && cells[configIndex] === "见下级参数";
}

finishPrimaryIfNeeded(lines.length);

if (!content.includes("二、流程及要素内容")) {
    errors.push(`${absolutePath} 缺少“二、流程及要素内容”。`);
}

if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
}

console.log(`OK: ${absolutePath}`);
