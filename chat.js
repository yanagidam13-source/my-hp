/**
 * chat.js — WebCraft お問い合わせチャットボット
 * Claude API (claude-haiku-4-5-20251001) を使用してお問い合わせに自動応答する
 *
 * ⚠️ 本番運用時はAPIキーをサーバーサイドプロキシで管理してください
 */

/* ===== APIキーは config.js から読み込む =====
 * config.js は .gitignore で除外されているため、
 * キーがリポジトリにコミットされることはありません。
 * ============================================ */

/* ===== システムプロンプト（会社情報・回答ルール） ===== */
const SYSTEM_PROMPT = `あなたは株式会社WebCraftのお問い合わせ対応AIアシスタントです。
以下の自社情報をもとに、丁寧かつ簡潔な日本語で応答してください。

【サービス名】
最高のWeb制作が、あなたの武器になる。

【サービス内容】
LP・コーポレートサイトの設計から制作・保守まで、現役エンジニアの伴走でビジネスを次のステージへ。
- LP・コーポレートサイト制作（デザイン〜コーディング一貫対応、SEO対策込み）
- 保守・運用サポート（月額、サイト更新・セキュリティ対応・アクセス解析）

【料金】
- サイト作成: 10万円（基本料金）
- 追加ページ: 1ページあたり2万円
- 保守料: 月額3,000円

【営業時間・連絡先】
※ 営業時間・電話番号・メールアドレスは後日設定予定です。
お問い合わせはこのチャットからお気軽にどうぞ。

【よくある質問と回答】
Q: 制作期間はどのくらいかかりますか？
A: 標準的なサイト（5ページ程度）で約2〜4週間です。ページ数や機能によって変動しますので、まずはご相談ください。

Q: 料金の支払い方法・タイミングはどうなっていますか？
A: 銀行振込にて、制作費の半額を着手時、残り半額を納品時にお支払いいただいています。保守料は毎月月末払いです。

Q: 公開後に修正をお願いできますか？
A: 公開後1ヶ月間は無料で修正対応いたします。それ以降は保守プラン（月額3,000円）でご対応します。

Q: デザインのイメージがないのですが大丈夫ですか？
A: もちろんです！ヒアリングシートをもとに、業種・ターゲット・ご要望をお聞きしながら一緒にデザインの方向性を決めていきます。

Q: 既存のサイトをリニューアルしたいのですが対応できますか？
A: はい、既存サイトのリニューアルも承っています。現在のサイトの課題をヒアリングし、改善提案も含めてご対応します。

【応答ルール】
- 回答は3〜5文程度のコンパクトな文章にする
- 料金は上記の金額を正確に案内する（「15万円〜」などの古い情報は使わない）
- 詳細な見積もりが必要な場合は「無料相談にてご案内します」と伝える
- Web制作・運用と無関係な質問には「Web制作・運用に関するご質問にお答えしています」と伝える
- 会話の最後に次のアクション（相談・問い合わせ）を促す`;

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
