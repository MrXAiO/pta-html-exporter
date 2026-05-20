// ==UserScript==
// @name         PTA 原样可编辑 HTML 导出助手 美化版
// @version      14.7.0
// @description  导出 PTA 题目为可编辑 HTML，支持左侧题号跳转、本地编辑、保存修改，并优化手机和平板显示。
// @author       XiAO
// @match        https://pintia.cn/problem-sets/*/exam/problems/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('pta-exporter-panel')) return;

    const panelHTML = `
        <div id="pta-exporter-panel" style="
            position: fixed;
            right: 28px;
            bottom: 36px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', Arial, sans-serif;
        ">
            <div id="pta-exporter-popup" style="
                display: none;
                width: 360px;
                margin-bottom: 14px;
                background: rgba(255,255,255,.96);
                border: 1px solid rgba(229,231,235,.9);
                border-radius: 18px;
                box-shadow: 0 18px 45px rgba(15,23,42,.18);
                padding: 18px;
                color: #111827;
                backdrop-filter: blur(14px);
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 12px;
                ">
                    <div style="
                        width: 38px;
                        height: 38px;
                        border-radius: 12px;
                        background: linear-gradient(135deg, #dc2626, #991b1b);
                        color: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 20px;
                        box-shadow: 0 8px 18px rgba(220,38,38,.28);
                    ">📄</div>

                    <div>
                        <div style="font-weight: 800; font-size: 18px; color: #111827;">PTA HTML 导出</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">可编辑 · 可跳转 · 可保存</div>
                    </div>
                </div>

                <div style="
                    font-size: 13px;
                    line-height: 1.7;
                    color: #4b5563;
                    background: #f9fafb;
                    border: 1px solid #eef2f7;
                    border-radius: 12px;
                    padding: 10px 12px;
                    margin-bottom: 12px;
                ">
                    只导出真实题目块。导出后左侧题号可跳转，可编辑题目、修改选项答案并保存。
                </div>

                <div id="pta-exporter-status" style="
                    min-height: 22px;
                    font-size: 13px;
                    color: #6b7280;
                    margin-bottom: 14px;
                    line-height: 1.5;
                ">等待操作。</div>

                <button id="pta-exporter-btn" style="
                    width: 100%;
                    height: 42px;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #dc2626, #b91c1c);
                    color: white;
                    font-size: 15px;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 10px 22px rgba(220,38,38,.26);
                    transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
                ">导出可编辑 HTML</button>
            </div>

            <button id="pta-exporter-main" style="
                width: 70px;
                height: 70px;
                border-radius: 18px;
                border: 2px solid rgba(255,255,255,.95);
                background: linear-gradient(135deg, #dc2626, #991b1b);
                color: #fff;
                box-shadow: 0 14px 30px rgba(185,28,28,.32);
                cursor: pointer;
                font-weight: 800;
                transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
            ">
                <div style="font-size: 22px; line-height: 1;">📄</div>
                <div style="font-size: 13px; margin-top: 5px;">导出</div>
            </button>

            <style>
                #pta-exporter-main:hover {
                    transform: translateY(-2px) scale(1.03);
                    box-shadow: 0 18px 36px rgba(185,28,28,.38);
                    filter: brightness(1.03);
                }

                #pta-exporter-main:active {
                    transform: scale(.96);
                }

                #pta-exporter-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 14px 28px rgba(220,38,38,.32);
                    filter: brightness(1.04);
                }

                #pta-exporter-btn:active {
                    transform: scale(.985);
                }

                #pta-exporter-btn:disabled {
                    opacity: .72;
                    cursor: not-allowed;
                    transform: none;
                }
            </style>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);

    const mainBtn = document.getElementById('pta-exporter-main');
    const popup = document.getElementById('pta-exporter-popup');
    const status = document.getElementById('pta-exporter-status');
    const exportBtn = document.getElementById('pta-exporter-btn');

    mainBtn.onclick = function () {
        popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
    };

    exportBtn.onclick = function () {
        try {
            exportBtn.disabled = true;
            exportBtn.textContent = '正在导出...';
            exportEditablePTAHTML();
        } catch (err) {
            console.error(err);
            status.textContent = '导出失败：' + err.message;
            status.style.color = '#dc2626';
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = '导出可编辑 HTML';
        }
    };

    function exportEditablePTAHTML() {
        status.textContent = '正在查找真实题目块...';
        status.style.color = '#6b7280';

        const problems = findProblemNodes();

        if (!problems.length) {
            status.textContent = '未找到题目。请确认题目已经加载完成。';
            status.style.color = '#dc2626';
            return;
        }

        status.textContent = '正在复制题目 DOM...';

        const styles = collectPageStyles();
        const cardsHTML = problems
            .map((node, index) => buildEditableCard(node, index + 1))
            .filter(Boolean)
            .join('\n');

        const html = buildExportDocument(styles, cardsHTML, problems.length);

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        downloadFile(html, `PTA_可编辑原样导出_美化_${problems.length}_${date}.html`);

        status.innerHTML = `导出完成，共 ${problems.length} 道题。`;
        status.style.color = '#16a34a';
    }

    function findProblemNodes() {
        const selectors = [
            'div.pc-x.pt-2.pl-4.scroll-mt-0[id]',
            'div[class~="pc-x"][class~="pt-2"][class~="pl-4"][class~="scroll-mt-0"][id]'
        ];

        let nodes = [];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(node => {
                if (!nodes.includes(node)) nodes.push(node);
            });
        });

        nodes = nodes.filter(node => {
            if (!node.id || node.id.length < 8) return false;
            if (node.id === 'exam-app') return false;
            if (node.id === 'pta-exporter-panel') return false;
            if (node.closest('#pta-exporter-panel')) return false;

            const hasMarkdown = !!node.querySelector('.rendered-markdown');
            const hasOptionInput = !!node.querySelector('label input[type="radio"], label input[type="checkbox"]');
            const hasLabel = !!node.querySelector('label');
            const text = node.innerText || '';
            const hasScore = /分数\s*\d+/.test(text);
            const hasQuestionNo = /[A-Z]?\d+-\d+/.test(text);

            return hasMarkdown && (hasOptionInput || hasLabel || hasScore || hasQuestionNo);
        });

        const unique = [];
        const seen = new Set();

        nodes.forEach(node => {
            if (!seen.has(node.id)) {
                seen.add(node.id);
                unique.push(node);
            }
        });

        unique.sort((a, b) => {
            const pos = a.compareDocumentPosition(b);
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            return 0;
        });

        return unique;
    }

    function buildEditableCard(originalNode, index) {
        if (!originalNode) return '';
        if (originalNode.id === 'exam-app') return '';

        const clone = originalNode.cloneNode(true);

        cleanExportNode(clone);
        syncInputs(originalNode, clone);
        fixImages(clone);
        fixLinks(clone);

        const answer = extractAnswer(originalNode);
        const questionNo = extractQuestionNo(originalNode) || String(index);

        return `
            <section class="export-question-card" id="question-${index}" data-question-index="${index}" data-question-no="${escapeHTML(questionNo)}">
                <div class="export-question-body">
                    ${clone.outerHTML}
                </div>

                <div class="export-answer-block" data-answer="${escapeHTML(answer)}">
                    <strong>答案：</strong><span>${escapeHTML(answer)}</span>
                </div>
            </section>
        `;
    }

    function cleanExportNode(node) {
        node.querySelectorAll('script, noscript, iframe').forEach(el => el.remove());
        node.querySelectorAll('#pta-exporter-panel').forEach(el => el.remove());
        node.querySelectorAll('#exam-app').forEach(el => el.remove());

        node.querySelectorAll(
            '[data-sidebar], .group\\/sidebar-wrapper, [id^="tab-"], .anchor-list, [data-sidebar="sidebar"], [data-sidebar="header"], [data-sidebar="content"], [data-sidebar="footer"]'
        ).forEach(el => el.remove());

        node.querySelectorAll('[contenteditable]').forEach(el => {
            el.removeAttribute('contenteditable');
        });

        node.querySelectorAll('[data-v-app]').forEach(el => {
            el.removeAttribute('data-v-app');
        });
    }

    function syncInputs(originalNode, cloneNode) {
        const originalInputs = Array.from(originalNode.querySelectorAll('input'));
        const cloneInputs = Array.from(cloneNode.querySelectorAll('input'));

        cloneInputs.forEach((input, index) => {
            const original = originalInputs[index];
            if (!original) return;

            if (original.checked) {
                input.setAttribute('checked', 'checked');
            } else {
                input.removeAttribute('checked');
            }

            if (original.disabled) {
                input.setAttribute('disabled', 'disabled');
            } else {
                input.removeAttribute('disabled');
            }

            if (original.value) {
                input.setAttribute('value', original.value);
            }
        });

        const originalTextareas = Array.from(originalNode.querySelectorAll('textarea'));
        const cloneTextareas = Array.from(cloneNode.querySelectorAll('textarea'));

        cloneTextareas.forEach((textarea, index) => {
            const original = originalTextareas[index];
            if (!original) return;
            textarea.textContent = original.value || original.textContent || '';
        });
    }

    function fixImages(node) {
        node.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src') || img.src;

            if (src) {
                try {
                    img.setAttribute('src', new URL(src, location.href).href);
                } catch (e) {
                    img.setAttribute('src', src);
                }
            }

            img.setAttribute('loading', 'lazy');
            img.setAttribute('referrerpolicy', 'no-referrer');
        });
    }

    function fixLinks(node) {
        node.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');

            if (href) {
                try {
                    a.setAttribute('href', new URL(href, location.href).href);
                } catch (e) {}
            }

            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });
    }

    function extractAnswer(node) {
        const labels = Array.from(node.querySelectorAll('label'));
        const checked = [];

        labels.forEach((label, index) => {
            const input = label.querySelector('input[type="radio"], input[type="checkbox"]');
            if (!input || !input.checked) return;

            const letter = getOptionLetter(label, index);
            checked.push(letter);
        });

        if (checked.length) return checked.join('');

        const text = node.innerText || '';
        const answerMatch = text.match(/答案[:：]\s*([A-Z正确错误对错TF]+)/);
        if (answerMatch) return answerMatch[1];

        return '无';
    }

    function getOptionLetter(label, index) {
        const spans = Array.from(label.querySelectorAll('span'));

        for (const span of spans) {
            const text = span.innerText.trim();
            const match = text.match(/^([A-Z])[.．、]?$/);
            if (match) return match[1];
        }

        const text = label.innerText.trim();
        const match = text.match(/^([A-Z])[.．、]?/);
        if (match) return match[1];

        return String.fromCharCode(65 + index);
    }

    function extractQuestionNo(node) {
        const btns = Array.from(node.querySelectorAll('button'));

        for (const btn of btns) {
            const t = btn.innerText.trim();
            if (/^[A-Z]?\d+-\d+/.test(t)) return t;
        }

        const text = node.innerText || '';
        const match = text.match(/[A-Z]?\d+-\d+/);
        return match ? match[0] : '';
    }

    function collectPageStyles() {
        let html = '';

        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            const clone = link.cloneNode(true);

            try {
                clone.setAttribute('href', new URL(href, location.href).href);
            } catch (e) {}

            html += clone.outerHTML + '\n';
        });

        document.querySelectorAll('style').forEach(style => {
            html += style.outerHTML + '\n';
        });

        return html;
    }

    function buildExportDocument(styles, cardsHTML, total) {
        const htmlClass = document.documentElement.className || '';
        const bodyClass = document.body.className || '';

        return `<!DOCTYPE html>
<html lang="zh-CN" class="${escapeHTML(htmlClass)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="author" content="XiAO">
<meta name="generator" content="PTA HTML Exporter by XiAO">
<meta name="exporter-version" content="14.7.0">
<!-- Exported by XiAO -->
<title>PTA 可编辑原样导出</title>

${styles}

<style>
    :root {
        --export-red: #dc2626;
        --export-border: #e5e7eb;
        --export-muted: #6b7280;
        --export-sidebar-width: 320px;
        --export-main-min-width: 980px;
    }

    html {
        overflow-x: auto;
    }

    body {
        margin: 0;
        background: #ffffff;
        color: #111827;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
        min-width: calc(var(--export-sidebar-width) + var(--export-main-min-width));
    }

    #export-layout {
        display: block;
        min-height: 100vh;
        width: 100%;
    }

    #export-left-nav {
        position: fixed;
        left: 0;
        top: 0;
        width: var(--export-sidebar-width);
        height: 100vh;
        overflow-y: auto;
        overflow-x: hidden;
        border-right: 1px solid #edf0f5;
        background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
        padding: 18px 20px;
        box-sizing: border-box;
        z-index: 9999;
    }

    #export-left-nav::-webkit-scrollbar {
        width: 6px;
    }

    #export-left-nav::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 999px;
    }

    .export-nav-title {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 21px;
        font-weight: 850;
        margin-bottom: 18px;
        color: #111827;
        letter-spacing: .5px;
    }

    .export-nav-title span:first-child {
        position: relative;
    }

    .export-nav-title span:first-child::after {
        content: "";
        position: absolute;
        left: 0;
        bottom: -6px;
        width: 34px;
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, #dc2626, #fb7185);
    }

    .export-nav-sub {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
        letter-spacing: 0;
        background: #f3f4f6;
        padding: 3px 8px;
        border-radius: 999px;
        white-space: nowrap;
    }

    .export-nav-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        align-items: center;
    }

    .export-nav-item {
        width: 100%;
        height: 54px;
        border-radius: 12px;
        border: 1px solid #fecaca;
        background: linear-gradient(180deg, #fff7f7 0%, #fff1f2 100%);
        color: #b91c1c;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        font-size: 15px;
        font-weight: 800;
        box-sizing: border-box;
        box-shadow: 0 4px 12px rgba(185,28,28,.06);
        transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease, background .14s ease;
    }

    .export-nav-item:hover {
        transform: translateY(-2px);
        background: #fff1f2;
        border-color: #f87171;
        box-shadow: 0 8px 18px rgba(185,28,28,.12);
        text-decoration: none;
    }

    .export-nav-item.correct {
        border-color: #fecaca;
        background: linear-gradient(180deg, #fff7f7 0%, #fff1f2 100%);
        color: #b91c1c;
    }

    .export-nav-item.wrong {
        border-color: #bbf7d0;
        background: linear-gradient(180deg, #f7fef9 0%, #ecfdf5 100%);
        color: #15803d;
        box-shadow: 0 4px 12px rgba(22,163,74,.06);
    }

    .export-nav-item.wrong:hover {
        border-color: #86efac;
        box-shadow: 0 8px 18px rgba(22,163,74,.12);
    }

    .export-nav-item.current {
        outline: 2px solid #2563eb;
        outline-offset: 3px;
        box-shadow: 0 0 0 5px rgba(37,99,235,.12);
    }

    #export-root {
        margin-left: var(--export-sidebar-width);
        padding: 14px 26px 90px 26px;
        min-width: var(--export-main-min-width);
        box-sizing: border-box;
    }

    .export-question-card {
        position: relative;
        margin-bottom: 18px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
        scroll-margin-top: 16px;
    }

    .export-question-body {
        padding: 0;
    }

    .export-answer-block {
        position: relative;
        margin: 14px 0 14px 0;
        padding: 14px 18px 14px 18px;
        background:
            linear-gradient(90deg, rgba(220,38,38,.08), rgba(255,255,255,.92) 42%),
            #ffffff;
        border: 1px solid #fee2e2;
        border-left: 5px solid var(--export-red);
        border-radius: 12px;
        color: #111827;
        box-shadow: 0 8px 20px rgba(15,23,42,.04);
    }

    .export-answer-block::before {
        content: "✓";
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        margin-right: 8px;
        border-radius: 999px;
        background: #dc2626;
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
    }

    .export-answer-block strong {
        font-weight: 850;
        color: #111827;
    }

    .export-answer-block span {
        color: var(--export-red);
        font-weight: 850;
        margin-left: 8px;
        letter-spacing: .5px;
    }

    body.export-hide-answer .export-answer-block {
        display: none;
    }

    body.export-editing .export-question-body,
    body.export-editing .export-answer-block {
        outline: 2px dashed rgba(220, 38, 38, .35);
        outline-offset: 2px;
    }

    body.export-editing .export-question-body:focus,
    body.export-editing .export-answer-block:focus {
        outline-color: rgba(220, 38, 38, .8);
    }

    body.export-editing input[type="radio"],
    body.export-editing input[type="checkbox"] {
        cursor: pointer !important;
        pointer-events: auto !important;
    }

    body.export-editing label {
        cursor: pointer !important;
        pointer-events: auto !important;
    }

    #export-floating-tools {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 10000;
        display: flex;
        gap: 8px;
        padding: 9px;
        background: rgba(255,255,255,.94);
        border: 1px solid rgba(229,231,235,.95);
        border-radius: 16px;
        box-shadow: 0 16px 38px rgba(15,23,42,.16);
        backdrop-filter: blur(14px);
    }

    #export-floating-tools button {
        border: 1px solid #e5e7eb;
        background: #ffffff;
        color: #111827;
        border-radius: 11px;
        padding: 8px 13px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: transform .14s ease, box-shadow .14s ease, background .14s ease, border-color .14s ease;
    }

    #export-floating-tools button:hover {
        transform: translateY(-1px);
        background: #f9fafb;
        border-color: #d1d5db;
        box-shadow: 0 6px 14px rgba(15,23,42,.08);
    }

    #export-floating-tools button:active {
        transform: scale(.97);
    }

    #export-floating-tools button.primary {
        border-color: #dc2626;
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(220,38,38,.22);
    }

    #export-floating-tools button.primary:hover {
        background: linear-gradient(135deg, #ef4444, #b91c1c);
        box-shadow: 0 10px 22px rgba(220,38,38,.28);
    }

    img {
        max-width: 100%;
        height: auto;
    }

    a {
        color: #2563eb;
    }

    /* 平板横屏 / 小屏桌面：保留左侧栏，但取消 1300px 强制宽度 */
    @media (max-width: 1200px) and (min-width: 769px) {
        :root {
            --export-sidebar-width: 240px;
            --export-main-min-width: 0px;
        }

        html,
        body {
            min-width: 0 !important;
            width: 100%;
            overflow-x: hidden;
        }

        #export-left-nav {
            width: var(--export-sidebar-width);
            padding: 14px 12px;
        }

        #export-root {
            margin-left: var(--export-sidebar-width);
            min-width: 0;
            width: calc(100% - var(--export-sidebar-width));
            padding: 14px 18px 90px 18px;
        }

        .export-nav-title {
            font-size: 18px;
            margin-bottom: 14px;
        }

        .export-nav-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }

        .export-nav-item {
            height: 44px;
            border-radius: 10px;
            font-size: 13px;
        }

        .export-question-body {
            width: 100%;
            overflow-x: auto;
        }

        .export-question-body pre,
        .export-question-body code,
        .export-question-body table {
            max-width: 100%;
            overflow-x: auto;
        }
    }

    /* 手机 / 平板竖屏：左侧栏改成顶部 sticky 题号栏 */
    @media (max-width: 768px) {
        :root {
            --export-sidebar-width: 0px;
            --export-main-min-width: 0px;
        }

        html,
        body {
            min-width: 0 !important;
            width: 100%;
            overflow-x: hidden;
        }

        body {
            font-size: 15px;
            -webkit-text-size-adjust: 100%;
        }

        #export-layout {
            display: block;
            width: 100%;
            min-height: 100vh;
        }

        #export-left-nav {
            position: sticky;
            top: 0;
            left: auto;
            width: 100%;
            height: auto;
            max-height: 38vh;
            overflow-y: auto;
            overflow-x: hidden;
            border-right: none;
            border-bottom: 1px solid #edf0f5;
            background: rgba(255,255,255,.96);
            padding: 12px 12px;
            box-sizing: border-box;
            z-index: 9999;
            box-shadow: 0 8px 20px rgba(15,23,42,.08);
            backdrop-filter: blur(12px);
        }

        .export-nav-title {
            font-size: 17px;
            margin-bottom: 12px;
            align-items: center;
        }

        .export-nav-title span:first-child::after {
            bottom: -5px;
            width: 28px;
        }

        .export-nav-sub {
            font-size: 12px;
            padding: 2px 7px;
        }

        .export-nav-grid {
            grid-template-columns: repeat(auto-fill, minmax(42px, 1fr));
            gap: 8px;
        }

        .export-nav-item {
            height: 40px;
            border-radius: 10px;
            font-size: 13px;
            box-shadow: none;
        }

        .export-nav-item:hover {
            transform: none;
        }

        .export-nav-item.current {
            outline-offset: 1px;
            box-shadow: 0 0 0 4px rgba(37,99,235,.10);
        }

        #export-root {
            margin-left: 0;
            min-width: 0;
            width: 100%;
            padding: 14px 12px 92px 12px;
            box-sizing: border-box;
        }

        .export-question-card {
            margin-bottom: 16px;
            padding-bottom: 12px;
            scroll-margin-top: 42vh;
        }

        .export-question-body {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .export-question-body * {
            max-width: 100%;
            box-sizing: border-box;
        }

        .export-question-body img {
            max-width: 100% !important;
            height: auto !important;
        }

        .export-question-body table {
            display: block;
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch;
        }

        .export-question-body pre {
            max-width: 100%;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
            -webkit-overflow-scrolling: touch;
        }

        .export-question-body code {
            white-space: pre-wrap;
            word-break: break-word;
        }

        .export-answer-block {
            margin: 12px 0;
            padding: 12px 14px;
            font-size: 14px;
            border-radius: 10px;
        }

        .export-answer-block::before {
            width: 20px;
            height: 20px;
            font-size: 12px;
            margin-right: 6px;
        }

        #export-floating-tools {
            left: 8px;
            right: 8px;
            bottom: calc(10px + env(safe-area-inset-bottom));
            justify-content: space-between;
            gap: 6px;
            padding: 8px;
            border-radius: 14px;
        }

        #export-floating-tools button {
            flex: 1;
            padding: 8px 4px;
            font-size: 12px;
            white-space: nowrap;
        }
    }

    @media print {
        html,
        body {
            min-width: 0;
            overflow-x: visible;
        }

        #export-left-nav,
        #export-floating-tools {
            display: none !important;
        }

        #export-layout {
            display: block;
        }

        #export-root {
            margin-left: 0;
            min-width: 0;
            padding: 0;
        }

        .export-question-card {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .export-answer-block {
            break-inside: avoid;
        }
    }
</style>
</head>

<body class="${escapeHTML(bodyClass)}">
    <div id="export-layout">
        <aside id="export-left-nav">
            <div class="export-nav-title">
                <span>题目总览</span>
                <span class="export-nav-sub">共 ${total} 题</span>
            </div>

            <div id="export-nav-grid" class="export-nav-grid"></div>
        </aside>

        <main id="export-root">
            ${cardsHTML}
        </main>
    </div>

    <div id="export-floating-tools" title="导出工具">
        <button type="button" onclick="toggleEditMode()">✎ 编辑</button>
        <button type="button" onclick="toggleAnswers()">☑ 答案</button>
        <button type="button" onclick="window.print()">⎙ 打印</button>
        <button type="button" class="primary" onclick="saveEditedHTML()">✓ 保存</button>
    </div>

<script>
(function () {
    window.buildLeftNav = function () {
        var grid = document.getElementById('export-nav-grid');
        if (!grid) return;

        grid.innerHTML = '';

        var cards = Array.from(document.querySelectorAll('.export-question-card'));

        cards.forEach(function (card, index) {
            var id = card.id || ('question-' + (index + 1));
            card.id = id;

            var resultText = card.innerText || '';
            var isWrong = resultText.includes('答案错误') || resultText.includes('0 分');

            var a = document.createElement('a');
            a.href = '#' + id;
            a.className = 'export-nav-item ' + (isWrong ? 'wrong' : 'correct');
            a.textContent = index + 1;
            a.title = '跳转到第 ' + (index + 1) + ' 题';

            a.addEventListener('click', function () {
                setCurrentNav(index + 1);
            });

            grid.appendChild(a);
        });
    };

    window.setCurrentNav = function (num) {
        document.querySelectorAll('.export-nav-item').forEach(function (item) {
            item.classList.remove('current');
        });

        var target = document.querySelectorAll('.export-nav-item')[num - 1];
        if (target) target.classList.add('current');
    };

    window.refreshLeftNavStatus = function () {
        var cards = Array.from(document.querySelectorAll('.export-question-card'));
        var items = Array.from(document.querySelectorAll('.export-nav-item'));

        cards.forEach(function (card, index) {
            var item = items[index];
            if (!item) return;

            var text = card.innerText || '';
            var isWrong = text.includes('答案错误') || text.includes('0 分');

            item.classList.remove('correct', 'wrong');
            item.classList.add(isWrong ? 'wrong' : 'correct');
        });
    };

    window.toggleEditMode = function () {
        var editing = document.body.classList.toggle('export-editing');

        document.querySelectorAll('.export-question-body, .export-answer-block').forEach(function (el) {
            el.setAttribute('contenteditable', editing ? 'true' : 'false');
            el.setAttribute('spellcheck', 'false');
        });

        document.querySelectorAll('.export-question-body input[type="radio"], .export-question-body input[type="checkbox"]').forEach(function (input) {
            input.disabled = !editing;

            if (editing) {
                input.removeAttribute('disabled');
                input.style.pointerEvents = 'auto';
                input.style.cursor = 'pointer';
            } else {
                input.setAttribute('disabled', 'disabled');
            }
        });

        document.querySelectorAll('.export-question-body label').forEach(function (label) {
            if (editing) {
                label.style.pointerEvents = 'auto';
                label.style.cursor = 'pointer';
            }
        });

        bindAnswerSyncEvents();

        alert(editing ? '已开启编辑模式。现在可以直接修改文字，也可以重新选择答案。' : '已关闭编辑模式。');
    };

    window.toggleAnswers = function () {
        document.body.classList.toggle('export-hide-answer');
    };

    window.bindAnswerSyncEvents = function () {
        document.querySelectorAll('.export-question-card').forEach(function (card) {
            if (card.dataset.answerBinded === '1') return;

            card.dataset.answerBinded = '1';

            card.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function (input) {
                input.addEventListener('change', function () {
                    updateAnswerBlock(card);
                    updateJudgeResultToCorrect(card);
                    refreshLeftNavStatus();
                });
            });
        });
    };

    window.updateAnswerBlock = function (card) {
        var answerBlock = card.querySelector('.export-answer-block');
        if (!answerBlock) return;

        var checkedInputs = Array.from(card.querySelectorAll(
            '.export-question-body input[type="radio"]:checked, .export-question-body input[type="checkbox"]:checked'
        ));

        var answers = checkedInputs.map(function (input) {
            var label = input.closest('label');
            return getOptionLetterFromLabel(label);
        }).filter(Boolean);

        var answer = answers.length ? answers.join('') : '无';

        answerBlock.setAttribute('data-answer', answer);

        var span = answerBlock.querySelector('span');
        if (span) span.textContent = answer;
    };

    window.getOptionLetterFromLabel = function (label) {
        if (!label) return '';

        var spans = Array.from(label.querySelectorAll('span'));

        for (var i = 0; i < spans.length; i++) {
            var text = spans[i].innerText.trim();
            var match = text.match(/^([A-Z])[.．、]?$/);
            if (match) return match[1];
        }

        var text2 = label.innerText.trim();
        var match2 = text2.match(/^([A-Z])[.．、]?/);
        if (match2) return match2[1];

        var parent = label.parentElement;
        if (!parent) return '';

        var allLabels = Array.from(parent.querySelectorAll('label'));
        var index = allLabels.indexOf(label);

        if (index >= 0) return String.fromCharCode(65 + index);

        return '';
    };

    window.getFullScoreFromCard = function (card) {
        var text = card.innerText || '';

        var scoreMatch = text.match(/分数\\s*([0-9.]+)/);
        if (scoreMatch) return scoreMatch[1];

        var tagMatch = text.match(/分数[:：]?\\s*([0-9.]+)/);
        if (tagMatch) return tagMatch[1];

        return '';
    };

    window.updateJudgeResultToCorrect = function (card) {
        var fullScore = getFullScoreFromCard(card);
        var blocks = Array.from(card.querySelectorAll('.export-question-body .grid, .export-question-body [class*="grid"]'));

        blocks.forEach(function (block) {
            var text = block.innerText || '';
            if (!text.includes('评测结果') && !text.includes('得分')) return;

            var children = Array.from(block.querySelectorAll('div, span'));

            children.forEach(function (el) {
                var t = el.innerText.trim();

                if (t === '答案错误' || t === '答案正确' || t === '未选择答案' || t === '答案已修改') {
                    el.textContent = '答案正确';
                    el.style.color = 'rgb(255, 59, 48)';
                }

                if (/^\\d+(\\.\\d+)?\\s*分$/.test(t)) {
                    if (fullScore) {
                        el.textContent = fullScore + ' 分';
                    }
                }
            });
        });
    };

    window.syncAllAnswersBeforeSave = function () {
        document.querySelectorAll('.export-question-card').forEach(function (card) {
            updateAnswerBlock(card);
            updateJudgeResultToCorrect(card);

            card.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function (input) {
                if (input.checked) {
                    input.setAttribute('checked', 'checked');
                } else {
                    input.removeAttribute('checked');
                }

                input.setAttribute('disabled', 'disabled');
                input.disabled = true;
            });
        });

        refreshLeftNavStatus();
    };

    window.saveEditedHTML = function () {
        syncAllAnswersBeforeSave();

        document.querySelectorAll('[contenteditable]').forEach(function (el) {
            el.setAttribute('contenteditable', 'false');
        });

        document.body.classList.remove('export-editing');

        var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');

        var date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.href = url;
        a.download = 'PTA_修改版_美化_' + date + '.html';

        document.body.appendChild(a);
        a.click();

        setTimeout(function () {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    };

    buildLeftNav();
    bindAnswerSyncEvents();
})();
</script>
</body>
</html>`;
    }

    function escapeHTML(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = filename;

        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    console.log(
        '%c PTA 可编辑 HTML 导出助手 美化版 %c 已加载 ',
        'background:#991b1b;color:#fff;padding:4px;border-radius:4px 0 0 4px;',
        'background:#111827;color:#facc15;padding:4px;border-radius:0 4px 4px 0;font-weight:bold;'
    );
})();
