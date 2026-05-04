/**
 * chat.js — WebCraft お問い合わせチャットボット
 * Claude API (claude-haiku-4-5-20251001) を使用してお問い合わせに自動応答する
 *
 * ⚠️ 本番運用時はAPIキーをサーバーサイドプロキシで管理してください
 */

/* ===== APIキー設定 ===== */
/* ※ 実際のAPIキーをここに設定してください */
const ANTHROPIC_API_KEY = 'YOUR_API_KEY_HERE';

/* ===== システムプロンプト（会社情報・回答ルール） ===== */
const SYSTEM_PROMPT = `あなたは株式会社WebCraftのお問い合わせ対応AIアシスタントです。
丁寧かつ簡潔な日本語で応答してください。

【会社情報】
- 社名: 株式会社WebCraft
- 事業: Web制作・保守運用
- 対応サービス:
  1. LP・コーポレートサイト制作（デザイン〜コーディング一貫対応、SEO対策込み）
  2. 保守・運用サポート（コンテンツ更新代行、セキュリティ対応、アクセス解析）
- 平均納期: 14日〜（規模による）
- 料金目安:
  - LP制作: 15万円〜
  - コーポレートサイト: 30万円〜
  - 保守プラン: 月額3万円〜
- 連絡先: info@webcraft.example.com

【応答ルール】
- 回答は3〜5文程度のコンパクトな文章にする
- 具体的な見積もりは「無料相談にて詳しくご案内します」と伝える
- 範囲外の質問（会社と無関係のトピック）は「Web制作・運用に関するご質問にお答えしています」と伝える
- 会話の最後に次のアクションを促す（例：「詳しくはメールまたはこのチャットでお聞かせください」）`;

/* ===== DOM要素の取得 ===== */
const chatToggle  = document.getElementById('chat-toggle');
const chatWindow  = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const chatInput   = document.getElementById('chat-input');
const chatSend    = document.getElementById('chat-send');

/* ===== 会話履歴（Claude API に送る messages 配列） ===== */
let history = [];

/* ===== チャットウィンドウ開閉 ===== */
chatToggle.addEventListener('click', () => {
  const isOpen = chatWindow.classList.toggle('open');
  /* 初回オープン時にウェルカムメッセージを表示 */
  if (isOpen && chatMessages.children.length === 0) {
    appendMessage('bot', 'こんにちは！WebCraftのAIアシスタントです。\nサービス内容・料金・納期など、お気軽にご質問ください。');
  }
  /* チャットが開いているときはフローティングボタンを隠す */
  chatToggle.style.display = isOpen ? 'none' : 'flex';
});

/* チャットウィンドウ外クリックでは閉じない（意図的に操作する設計） */

/* ===== メッセージを画面に追加する ===== */
function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  /* 改行コードをbrタグに変換してXSSを防ぎながら表示 */
  div.textContent = text;
  div.style.whiteSpace = 'pre-wrap';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

/* ===== タイピングインジケーターを表示 ===== */
function showTyping() {
  const div = document.createElement('div');
  div.className = 'chat-msg bot typing';
  div.id = 'typing-indicator';
  div.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ===== タイピングインジケーターを削除 ===== */
function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

/* ===== Claude API にメッセージを送信 ===== */
async function sendToAPI(userText) {
  /* 会話履歴にユーザーメッセージを追加 */
  history.push({ role: 'user', content: userText });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      /* ブラウザからの直接リクエストを許可するヘッダー */
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: history,
    }),
  });

  if (!response.ok) {
    throw new Error(`API エラー: ${response.status}`);
  }

  const data = await response.json();
  const assistantText = data.content[0].text;

  /* 会話履歴にアシスタントの返答を追加 */
  history.push({ role: 'assistant', content: assistantText });

  return assistantText;
}

/* ===== メッセージ送信処理 ===== */
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text || chatSend.disabled) return;

  /* 入力欄をクリアしてボタンを無効化 */
  chatInput.value = '';
  chatSend.disabled = true;
  autoResizeTextarea();

  appendMessage('user', text);
  showTyping();

  try {
    const reply = await sendToAPI(text);
    removeTyping();
    appendMessage('bot', reply);
  } catch (err) {
    removeTyping();
    appendMessage('bot', '申し訳ありません。一時的にエラーが発生しました。\ninfo@webcraft.example.com までメールでお問い合わせください。');
    console.error('Chat API error:', err);
  } finally {
    chatSend.disabled = false;
    chatInput.focus();
  }
}

/* ===== 送信ボタンクリック ===== */
chatSend.addEventListener('click', handleSend);

/* ===== Enterキーで送信（Shift+Enterで改行） ===== */
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

/* ===== テキストエリアの高さを入力に合わせて自動調整 ===== */
function autoResizeTextarea() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
}

chatInput.addEventListener('input', autoResizeTextarea);

/* ===== チャットを閉じて元に戻すボタン（ヘッダーに追加） ===== */
const chatHeader = document.querySelector('.chat-header');
const closeBtn = document.createElement('button');
closeBtn.textContent = '✕';
closeBtn.style.cssText = `
  background: none; border: none; color: var(--muted);
  cursor: pointer; font-size: 0.9rem; padding: 4px; margin-left: 8px;
  transition: color 0.2s; line-height: 1;
`;
closeBtn.setAttribute('aria-label', 'チャットを閉じる');
closeBtn.addEventListener('mouseover', () => closeBtn.style.color = 'var(--text)');
closeBtn.addEventListener('mouseout',  () => closeBtn.style.color = 'var(--muted)');
closeBtn.addEventListener('click', () => {
  chatWindow.classList.remove('open');
  chatToggle.style.display = 'flex';
});
chatHeader.appendChild(closeBtn);
