// --- 阅读器 HTML 结构注入 (js/modules/reader_html.js) ---

const readerHtml = `
    <!-- 阅读器书架页面 -->
    <div id="reader-bookshelf-screen" class="screen">
        <header class="app-header">
            <button class="back-btn" data-target="home-screen">‹</button>
            <div class="title-container"><h1 class="title">书架</h1></div>
            <div class="action-btn-group">
                <button class="action-btn" id="upload-book-btn" aria-label="导入书籍"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v5h16v-5M12 3v12m-5-5 5 5 5-5"/></svg></button><button class="action-btn" id="reader-manage-btn" title="管理">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="action-btn" id="reader-cancel-manage-btn" style="display: none; font-size: 14px; width: auto; padding: 0 8px;">取消</button>
            </div>
        </header>
        <main class="content reader-bookshelf-content">
            <div id="reader-folder-tabs" class="r89-folder-tabs"></div>
            <input id="reader-shelf-search" class="r89-search" placeholder="搜索书名、作者" aria-label="搜索书名、作者">
            <div id="reader-carousel" class="r89-carousel" aria-label="滑动选书"></div>
            <div id="reader-carousel-title" class="r89-carousel-title"></div>
            <button id="reader-random-book" class="r89-random">⤨　随机选一本</button>
            <div class="r89-carousel-hint">左右滑动 · 轻点阅读</div>
            <div class="r89-list-heading"><span id="reader-list-name">全部书籍</span><small id="reader-book-count"></small></div>
            <div class="bookshelf-grid" id="bookshelf-grid"></div>
            <input type="file" id="reader-file-upload" accept=".txt,.epub,.docx" style="display: none;">
        </main>
    </div>

    <!-- 阅读器阅读页面 -->
    <div id="reader-view-screen" class="screen reader-view-screen reader-theme-default">
        <header class="app-header reader-header" id="reader-header">
            <button class="back-btn" id="reader-back-btn">‹</button>
            <div class="title-container"><h1 class="title" id="reader-book-title">书名</h1></div>
            <button class="action-btn reader-aa" id="reader-settings-btn" aria-label="阅读排版">Aa</button>
        </header>
        
        <main class="content reader-content" id="reader-content-area">
            <div id="reader-text-container" class="reader-text-container">
                <div class="reader-chapter-title" id="reader-chapter-title">章节标题</div>
                <div id="reader-text-content">
                    <!-- JS 动态注入正文 -->
                </div>
            </div>
            <!-- 触控区域 -->
            <div class="reader-touch-zone left" id="reader-touch-left"></div>
            <div class="reader-touch-zone center" id="reader-touch-center"></div>
            <div class="reader-touch-zone right" id="reader-touch-right"></div>
        </main>

        <footer class="reader-footer" id="reader-footer">
            <button class="reader-footer-btn" id="reader-toc-btn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                目录
            </button>
            <div class="reader-progress-info" id="reader-progress-info">0.0%</div>
            <button class="reader-footer-btn" id="reader-highlights-btn">摘录</button>
        </footer>

        <!-- 目录侧边栏 -->
        <div class="reader-toc-overlay" id="reader-toc-overlay">
            <div class="reader-toc-panel">
                <div class="reader-toc-header">
                    <span>目录</span>
                    <span id="reader-toc-count" style="font-size: 12px; color: #888; font-weight: normal;">共0章</span>
                </div>
                <ul class="reader-toc-list" id="reader-toc-list">
                    <!-- JS 动态注入目录 -->
                </ul>
            </div>
        </div>

        <!-- 段落长按悬浮菜单 -->
        <div class="reader-paragraph-menu" id="reader-paragraph-menu" style="display: none;">
            <button class="reader-menu-btn" id="reader-menu-comment">划线／段评</button>
            <div class="reader-menu-divider"></div>
            <button class="reader-menu-btn" id="reader-menu-copy">复制</button>
            <button class="reader-menu-btn" id="reader-menu-share">转发</button>
        </div>

        <!-- 段评底部面板遮罩层 -->
        <div class="reader-comment-overlay" id="reader-comment-overlay">
            <div class="reader-comment-panel" id="reader-comment-panel">
                <div class="reader-comment-header">
                    <span id="reader-comment-title">段评</span>
                    <button class="reader-comment-close" id="reader-comment-close">×</button>
                </div>
                <div class="reader-comment-quote" id="reader-comment-quote">
                    <!-- 引文内容 -->
                </div>
                <div class="reader-comment-list" id="reader-comment-list">
                    <!-- 评论列表 -->
                </div>
                <div class="reader-comment-input-area">
                    <input type="text" id="reader-comment-input" placeholder="写下你的想法...">
                    <button id="reader-comment-send">发送</button>
                </div>
            </div>
        </div>

        <!-- 设置面板遮罩层 -->
        <div class="reader-settings-overlay" id="reader-settings-overlay">
            <div class="reader-settings-panel" id="reader-settings-panel">
                <div class="reader-settings-header">
                    <span>阅读排版 · Aa</span>
                    <button class="reader-settings-close" id="reader-settings-close">×</button>
                </div>
                <div class="reader-settings-content">
                    <div class="reader-setting-row"><label for="reader-page-mode">翻页模式</label><select id="reader-page-mode"><option value="tap">点击翻页</option><option value="swipe">左右滑动</option><option value="scroll">上下滚动</option></select></div>
                    <div id="reader-appearance-fields"></div>
                    <div class="reader-setting-row" style="border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px; margin-top: 10px;">
                        <div class="reader-setting-label" style="width: auto; margin-right: 15px;">智能插图</div>
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                            <select id="reader-illustration-count" style="padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.5); color: var(--reader-text-color);">
                                <option value="1">1张</option>
                                <option value="3" selected>3张</option>
                                <option value="6">6张</option>
                                <option value="9">9张</option>
                            </select>
                            <button id="reader-generate-illustration-btn" class="reader-btn-small" style="background: var(--primary-color); color: white; border: none; flex: 1;">生成本章插图</button>
                        </div>
                    </div>
                    <div id="reader-illustration-progress" style="display: none; font-size: 12px; color: var(--primary-color); text-align: center; margin-top: -10px; margin-bottom: 15px;">
                        正在构思分镜...
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 全屏图片查看器 -->
    <div id="reader-fullscreen-viewer" class="reader-fullscreen-viewer">
        <img id="reader-fullscreen-img" src="" alt="Fullscreen Image">
    </div>
`;

// 将 HTML 注入到 phone-screen 中
document.addEventListener('DOMContentLoaded', () => {
    const phoneScreen = document.querySelector('.phone-screen');
    if (phoneScreen) {
        phoneScreen.insertAdjacentHTML('beforeend', readerHtml);
    }
});
