// AI财经助手 - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const historyBtn = document.getElementById('historyBtn');
  const upgradeBtn = document.getElementById('upgradeBtn');

  // 初始化
  checkPageStatus();
  loadUsage();

  // 检查当前页面状态
  async function checkPageStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab.url || '';

      const supportedDomains = [
        'eastmoney.com', 'sina.com.cn', 'xueqiu.com', '10jqka.com.cn',
        'cls.cn', 'wallstreetcn.com', 'caixin.com', 'yicai.com', 'stcn.com'
      ];

      const isSupported = supportedDomains.some(d => url.includes(d));

      if (isSupported) {
        document.getElementById('statusIcon').textContent = '✅';
        document.getElementById('statusTitle').textContent = '当前页面支持分析';
        document.getElementById('statusDesc').textContent = '点击下方按钮开始';
        analyzeBtn.disabled = false;
      } else {
        document.getElementById('statusIcon').textContent = '📄';
        document.getElementById('statusTitle').textContent = '当前页面不支持';
        document.getElementById('statusDesc').textContent = '请打开财经新闻页面';
        analyzeBtn.disabled = true;
      }
    } catch (e) {
      console.error('检测页面失败:', e);
    }
  }

  // 加载用量
  async function loadUsage() {
    try {
      const usage = await chrome.runtime.sendMessage({ type: 'getUsage' });
      if (usage) {
        const percent = Math.min(100, (usage.count / usage.limit) * 100);
        document.getElementById('usageBar').style.width = percent + '%';
        document.getElementById('usageText').textContent = `${usage.count} / ${usage.limit} 次`;
        
        const badge = document.getElementById('usageBadge');
        if (usage.isPro) {
          badge.textContent = 'Pro版';
          badge.classList.add('pro');
        }
      }
    } catch (e) {
      console.error('加载用量失败:', e);
    }
  }

  // 分析按钮点击
  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    const btnText = analyzeBtn.querySelector('.btn-text');
    const btnLoading = analyzeBtn.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    try {
      // 向当前页面的content script发送分析指令
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { action: 'analyze' });
    } catch (e) {
      console.error('分析失败:', e);
    }

    // 等待一段时间后恢复状态
    setTimeout(() => {
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      analyzeBtn.disabled = false;
      loadUsage(); // 刷新用量
    }, 2000);
  });

  // 设置按钮
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 历史记录按钮（暂未实现）
  historyBtn.addEventListener('click', () => {
    alert('历史记录功能开发中，敬请期待！');
  });

  // 升级Pro按钮
  upgradeBtn.addEventListener('click', () => {
    alert('Pro版即将上线！敬请期待。');
  });
});
