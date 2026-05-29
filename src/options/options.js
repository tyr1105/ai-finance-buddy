// AI财经助手 - Options Script

document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('model');
  const customEndpointInput = document.getElementById('customEndpoint');
  const customEndpointGroup = document.getElementById('customEndpointGroup');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const upgradeBtn = document.getElementById('upgradeBtn');

  // 加载已保存的设置
  loadSettings();

  // 提供商切换时更新模型选项和端点显示
  providerSelect.addEventListener('change', () => {
    updateModelOptions();
    toggleCustomEndpoint();
  });

  // 保存设置
  saveBtn.addEventListener('click', saveSettings);

  // 加载设置
  async function loadSettings() {
    try {
      const settings = await chrome.runtime.sendMessage({ type: 'getSettings' });
      if (settings) {
        providerSelect.value = settings.provider || 'deepseek';
        apiKeyInput.value = settings.apiKey || '';
        modelSelect.value = settings.model || 'deepseek-chat';
        customEndpointInput.value = settings.customEndpoint || '';
        toggleCustomEndpoint();
      }
    } catch (e) {
      console.error('加载设置失败:', e);
    }
  }

  // 保存设置
  async function saveSettings() {
    const settings = {
      provider: providerSelect.value,
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value,
      customEndpoint: customEndpointInput.value.trim(),
      isPro: false,
      language: 'zh-CN'
    };

    try {
      await chrome.runtime.sendMessage({
        type: 'saveSettings',
        data: settings
      });
      saveStatus.textContent = '✅ 设置已保存';
      setTimeout(() => { saveStatus.textContent = ''; }, 3000);
    } catch (e) {
      saveStatus.textContent = '❌ 保存失败: ' + e.message;
    }
  }

  // 更新模型下拉选项
  function updateModelOptions() {
    const provider = providerSelect.value;
    modelSelect.innerHTML = '';

    const models = {
      deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat（推荐）' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner（更强推理）' }
      ],
      openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini（性价比）' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
      ],
      custom: [
        { value: '', label: '请在下方配置端点' }
      ]
    };

    (models[provider] || models.custom).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      modelSelect.appendChild(opt);
    });
  }

  // 显示/隐藏自定义端点
  function toggleCustomEndpoint() {
    customEndpointGroup.style.display = 
      providerSelect.value === 'custom' ? 'block' : 'none';
  }

  // Pro按钮
  upgradeBtn.addEventListener('click', () => {
    alert('Pro版即将上线！关注我们的更新。');
  });
});
