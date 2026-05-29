// AI财经助手 - Background Service Worker
// 处理API请求、用量统计、消息中转

const DEFAULT_DAILY_LIMIT = 5;
const API_ENDPOINTS = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  custom: '' // 用户自定义
};

// 监听来自content script和popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'analyze') {
    handleAnalyze(message.data).then(sendResponse);
    return true; // 异步响应
  }
  if (message.type === 'getUsage') {
    getUsage().then(sendResponse);
    return true;
  }
  if (message.type === 'getSettings') {
    getSettings().then(sendResponse);
    return true;
  }
  if (message.type === 'saveSettings') {
    saveSettings(message.data).then(sendResponse);
    return true;
  }
});

// 获取今日用量
async function getUsage() {
  const today = new Date().toISOString().split('T')[0];
  const result = await chrome.storage.local.get(['usage']);
  const usage = result.usage || { date: today, count: 0 };
  
  // 日期变了，重置计数
  if (usage.date !== today) {
    usage.date = today;
    usage.count = 0;
  }
  
  const settings = await getSettings();
  const limit = settings.isPro ? 999 : DEFAULT_DAILY_LIMIT;
  
  return {
    count: usage.count,
    limit: limit,
    remaining: Math.max(0, limit - usage.count),
    isPro: settings.isPro || false,
    date: today
  };
}

// 增加用量
async function incrementUsage() {
  const today = new Date().toISOString().split('T')[0];
  const result = await chrome.storage.local.get(['usage']);
  const usage = result.usage || { date: today, count: 0 };
  
  if (usage.date !== today) {
    usage.date = today;
    usage.count = 0;
  }
  
  usage.count += 1;
  await chrome.storage.local.set({ usage });
  return usage.count;
}

// 获取设置
async function getSettings() {
  const result = await chrome.storage.local.get(['settings']);
  return result.settings || {
    apiKey: '',
    provider: 'deepseek',
    customEndpoint: '',
    model: 'deepseek-chat',
    isPro: false,
    language: 'zh-CN'
  };
}

// 保存设置
async function saveSettings(data) {
  await chrome.storage.local.set({ settings: data });
  return { success: true };
}

// 核心：调用LLM分析财经新闻
async function handleAnalyze(data) {
  const usage = await getUsage();
  
  if (!usage.isPro && usage.remaining <= 0) {
    return {
      error: 'daily_limit_reached',
      message: '今日免费额度已用完，升级Pro可无限使用',
      usage: usage
    };
  }
  
  const settings = await getSettings();
  
  if (!settings.apiKey) {
    return {
      error: 'no_api_key',
      message: '请先在设置中配置API Key'
    };
  }
  
  const endpoint = settings.provider === 'custom' 
    ? settings.customEndpoint 
    : API_ENDPOINTS[settings.provider];
  
  if (!endpoint) {
    return { error: 'no_endpoint', message: '请配置API端点' };
  }
  
  const systemPrompt = `你是一位专业的财经分析师AI助手。你的任务是分析财经新闻文章并提取关键信息。

请严格按照以下JSON格式输出（不要包含markdown代码块标记）：

{
  "summary": "100字以内的核心摘要",
  "sentiment": "看多/看空/中性",
  "sentiment_score": 0.0到1.0之间的数值(0=极度看空, 0.5=中性, 1=极度看多),
  "key_points": ["要点1", "要点2", "要点3"],
  "stocks_mentioned": [
    {"name": "股票名称", "code": "股票代码", "impact": "利好/利空/中性"}
  ],
  "investment_thesis": "基于本文的简短投资建议(50字内)",
  "risk_factors": ["风险因素1", "风险因素2"],
  "source_credibility": "高/中/低",
  "data_points": ["关键数据1", "关键数据2"]
}

注意：
- 保持客观，不要过度解读
- 如果文章涉及具体股票，务必提取股票代码
- 投资建议要谨慎，加上风险提示
- 使用中文输出`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请分析以下财经新闻文章：\n\n标题：${data.title}\n\n内容：${data.content.substring(0, 8000)}` }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { error: 'api_error', message: `API错误(${response.status}): ${errorText}` };
    }
    
    const result = await response.json();
    const content = result.choices[0].message.content;
    
    // 解析JSON结果
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (e) {
      // 尝试从markdown代码块中提取
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1]);
      } else {
        analysis = { raw_content: content, error: 'json_parse_error' };
      }
    }
    
    // 增加用量
    await incrementUsage();
    const updatedUsage = await getUsage();
    
    return {
      success: true,
      analysis: analysis,
      usage: updatedUsage,
      model: settings.model
    };
    
  } catch (err) {
    return { error: 'network_error', message: `网络错误: ${err.message}` };
  }
}

// 安装/更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 首次安装，打开设置页
    chrome.tabs.create({ url: 'src/options/options.html' });
  }
});
