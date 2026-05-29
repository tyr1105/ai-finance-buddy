// AI财经助手 - Content Script
// 在财经网页上注入分析按钮和结果面板

class FinanceAnalyzer {
  constructor() {
    this.panel = null;
    this.button = null;
    this.isAnalyzing = false;
    this.init();
  }

  init() {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.injectButton();
    this.injectStyles();
    console.log('[AI财经助手] 已加载');
  }

  // 注入浮动分析按钮
  injectButton() {
    // 防止重复注入
    if (document.getElementById('ai-finance-btn')) return;

    this.button = document.createElement('div');
    this.button.id = 'ai-finance-btn';
    this.button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    `;
    this.button.title = 'AI分析这篇文章';
    this.button.addEventListener('click', () => this.analyze());

    document.body.appendChild(this.button);
  }

  // 提取页面文章内容（适配主流财经网站）
  extractContent() {
    let title = '';
    let content = '';
    const url = window.location.href;

    // 通用选择器策略：先尝试站点特定，再回退通用
    const siteConfigs = {
      'eastmoney.com': {
        title: 'h1, .title, .newsContent h1, .article-title',
        content: '.Body, .newsContent, .txt-info, #ContentBody, .article-body'
      },
      'sina.com.cn': {
        title: 'h1, .main-title, .art_t',
        content: '#artibody, .article-content, .main-content'
      },
      'xueqiu.com': {
        title: 'h1, .article__bd__title, .status-title',
        content: '.article__bd__detail, .status-content, .detail'
      },
      '10jqka.com.cn': {
        title: 'h1, .title, .art-title',
        content: '.art_t, #artibody, .article-content'
      },
      'cls.cn': {
        title: 'h1, .title, .detail-title',
        content: '.content, .detail-content, .article-body'
      },
      'wallstreetcn.com': {
        title: 'h1, .title, .article-title',
        content: '.article-content, .content-body, .richtext'
      },
      'caixin.com': {
        title: 'h1, .title',
        content: '#articleContent, .article-content, .text'
      },
      'yicai.com': {
        title: 'h1, .title',
        content: '.article-content, .txt-content, #articlecontent'
      },
      'stcn.com': {
        title: 'h1, .title',
        content: '.article-content, .txt-content'
      }
    };

    // 查找匹配的站点配置
    let config = null;
    for (const [domain, selectors] of Object.entries(siteConfigs)) {
      if (url.includes(domain)) {
        config = selectors;
        break;
      }
    }

    // 尝试用站点特定选择器
    if (config) {
      const titleEl = document.querySelector(config.title);
      const contentEl = document.querySelector(config.content);
      if (titleEl) title = titleEl.textContent.trim();
      if (contentEl) content = contentEl.innerText.trim();
    }

    // 回退：通用提取策略
    if (!title) {
      title = document.querySelector('h1')?.textContent?.trim() || document.title || '未知标题';
    }
    if (!content || content.length < 100) {
      // 尝试常见的文章容器
      const selectors = [
        'article', '[role="article"]', '.article', '.post-content',
        '.entry-content', '.content', 'main', '#content', '#main'
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim().length > 200) {
          content = el.innerText.trim();
          break;
        }
      }
    }

    // 最终回退：取body中段落文本
    if (!content || content.length < 100) {
      const paragraphs = document.querySelectorAll('p');
      content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(t => t.length > 20)
        .join('\n\n');
    }

    return { title, content: content.substring(0, 10000), url };
  }

  // 执行分析
  async analyze() {
    if (this.isAnalyzing) return;

    const { title, content, url } = this.extractContent();
    
    if (!content || content.length < 50) {
      this.showToast('未能提取到文章内容，请确保在财经新闻页面使用', 'error');
      return;
    }

    this.isAnalyzing = true;
    this.updateButtonState('loading');
    this.showPanel('loading', { title });

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'analyze',
        data: { title, content, url }
      });

      if (response.error) {
        this.showPanel('error', response);
      } else {
        this.showPanel('result', response);
      }
    } catch (err) {
      this.showPanel('error', { message: `通信错误: ${err.message}` });
    } finally {
      this.isAnalyzing = false;
      this.updateButtonState('ready');
    }
  }

  // 更新按钮状态
  updateButtonState(state) {
    if (!this.button) return;
    if (state === 'loading') {
      this.button.classList.add('loading');
      this.button.title = '正在分析...';
    } else {
      this.button.classList.remove('loading');
      this.button.title = 'AI分析这篇文章';
    }
  }

  // 显示分析面板
  showPanel(type, data) {
    // 移除旧面板
    const oldPanel = document.getElementById('ai-finance-panel');
    if (oldPanel) oldPanel.remove();

    this.panel = document.createElement('div');
    this.panel.id = 'ai-finance-panel';
    this.panel.className = 'ai-finance-panel';

    if (type === 'loading') {
      this.panel.innerHTML = `
        <div class="ai-panel-header">
          <span class="ai-panel-title">🤖 AI正在分析...</span>
          <button class="ai-panel-close" onclick="this.closest('#ai-finance-panel').remove()">✕</button>
        </div>
        <div class="ai-panel-loading">
          <div class="ai-spinner"></div>
          <p>正在解析: ${this.escapeHtml(data.title.substring(0, 50))}...</p>
        </div>
      `;
    } else if (type === 'error') {
      this.panel.innerHTML = `
        <div class="ai-panel-header">
          <span class="ai-panel-title">❌ 分析失败</span>
          <button class="ai-panel-close" onclick="this.closest('#ai-finance-panel').remove()">✕</button>
        </div>
        <div class="ai-panel-error">
          <p>${this.escapeHtml(data.message)}</p>
          ${data.error === 'daily_limit_reached' ? 
            '<p class="ai-upgrade">升级Pro版本可无限使用 →</p>' : ''}
          ${data.error === 'no_api_key' ? 
            '<p class="ai-hint">点击扩展图标 → 设置 → 配置API Key</p>' : ''}
        </div>
      `;
    } else if (type === 'result') {
      const a = data.analysis;
      const sentimentEmoji = {
        '看多': '📈', '看空': '📉', '中性': '➡️'
      }[a.sentiment] || '❓';
      
      const sentimentColor = {
        '看多': '#e74c3c', '看空': '#27ae60', '中性': '#95a5a6'
      }[a.sentiment] || '#95a5a6';

      this.panel.innerHTML = `
        <div class="ai-panel-header">
          <span class="ai-panel-title">🤖 AI分析报告</span>
          <button class="ai-panel-close" onclick="this.closest('#ai-finance-panel').remove()">✕</button>
        </div>
        <div class="ai-panel-body">
          <div class="ai-section ai-summary">
            <div class="ai-section-title">📝 核心摘要</div>
            <p>${this.escapeHtml(a.summary || '无')}</p>
          </div>
          
          <div class="ai-section ai-sentiment" style="border-left: 4px solid ${sentimentColor}">
            <div class="ai-section-title">📊 市场情绪</div>
            <div class="ai-sentiment-bar">
              <span class="ai-sentiment-emoji">${sentimentEmoji}</span>
              <span class="ai-sentiment-text" style="color:${sentimentColor}">${this.escapeHtml(a.sentiment || '未知')}</span>
              <span class="ai-sentiment-score">置信度: ${((a.sentiment_score || 0.5) * 100).toFixed(0)}%</span>
            </div>
          </div>

          ${a.key_points && a.key_points.length ? `
          <div class="ai-section">
            <div class="ai-section-title">🔑 关键要点</div>
            <ul class="ai-list">
              ${a.key_points.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}
            </ul>
          </div>` : ''}

          ${a.stocks_mentioned && a.stocks_mentioned.length ? `
          <div class="ai-section">
            <div class="ai-section-title">💹 相关股票</div>
            <div class="ai-stocks">
              ${a.stocks_mentioned.map(s => {
                const impactColor = { '利好': '#e74c3c', '利空': '#27ae60', '中性': '#95a5a6' }[s.impact] || '#95a5a6';
                return `<div class="ai-stock-item">
                  <span class="ai-stock-name">${this.escapeHtml(s.name)}</span>
                  <span class="ai-stock-code">${this.escapeHtml(s.code || '')}</span>
                  <span class="ai-stock-impact" style="color:${impactColor}">${this.escapeHtml(s.impact)}</span>
                </div>`;
              }).join('')}
            </div>
          </div>` : ''}

          ${a.data_points && a.data_points.length ? `
          <div class="ai-section">
            <div class="ai-section-title">📊 关键数据</div>
            <ul class="ai-list ai-data-list">
              ${a.data_points.map(d => `<li>${this.escapeHtml(d)}</li>`).join('')}
            </ul>
          </div>` : ''}

          <div class="ai-section ai-investment">
            <div class="ai-section-title">💡 投资视角</div>
            <p>${this.escapeHtml(a.investment_thesis || '无建议')}</p>
          </div>

          ${a.risk_factors && a.risk_factors.length ? `
          <div class="ai-section ai-risks">
            <div class="ai-section-title">⚠️ 风险提示</div>
            <ul class="ai-list">
              ${a.risk_factors.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>` : ''}

          <div class="ai-footer">
            <span class="ai-model">模型: ${this.escapeHtml(data.model || 'AI')}</span>
            <span class="ai-usage">今日剩余: ${data.usage.remaining}次</span>
          </div>
        </div>
      `;
    }

    document.body.appendChild(this.panel);
    
    // 添加关闭按钮的键盘支持
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const panel = document.getElementById('ai-finance-panel');
        if (panel) panel.remove();
      }
    });
  }

  // Toast提示
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `ai-toast ai-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // HTML转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // 注入样式
  injectStyles() {
    if (document.getElementById('ai-finance-styles')) return;
    // 样式在content.css中通过manifest注入
  }
}

// 启动
new FinanceAnalyzer();
