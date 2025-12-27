// ==UserScript==
// @name         GSS3 - Gyazo-Scrapbox Search
// @namespace    http://tampermonkey.net/
// @version      2025-12-28
// @description  Gyazo+Scrapbox Search
// @author       Toshiyuki Masui
// @match        https://scrapbox.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=example.com
// @run-at       context-menu
// @grant        GM.xmlHttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

// gss2.jsをChatGPTに直してもらったもの

/**
 * Gyazoでキーワード検索してから、その画像がCosense(Scrapbox)に含まれているかチェックする
 */
(async () => {
  'use strict';

  // ---- Helpers -------------------------------------------------------------

  const getQueryFromPage = () =>
    document.querySelector('.form-control')?.value?.trim() ?? '';

  const ensureGyazoToken = async () => {
    let token = await GM.getValue('GYAZO_TOKEN', '');
    if (token) return token;

    const input = prompt('GYAZO TOKENを入力してください');
    if (!input) return '';

    token = input.trim();
    if (!token) return '';

    await GM.setValue('GYAZO_TOKEN', token);
    return token;
  };

  const gmFetch = (url, options = {}) => {
    // TampermonkeyがGM.fetchを提供している場合はそれを優先
    if (typeof GM !== 'undefined' && typeof GM.fetch === 'function') {
      return GM.fetch(url, options);
    }

    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: options.method ?? 'GET',
        url,
        headers: options.headers,
        data: options.body,
        onload: (res) => {
          const ok = res.status >= 200 && res.status < 300;

          resolve({
            ok,
            status: res.status,
            text: async () => res.responseText,
            json: async () => {
              try {
                return JSON.parse(res.responseText);
              } catch {
                return null;
              }
            },
          });
        },
        onerror: reject,
      });
    });
  };

  const openResultWindow = (titleText) => {
    const win = window.open('', '_blank');
    if (!win) return null;

    const { document: doc } = win;
    doc.title = titleText;

    const h1 = doc.createElement('h1');
    h1.textContent = titleText;
    doc.body.appendChild(h1);

    const ul = doc.createElement('ul');
    doc.body.appendChild(ul);

    return { win, doc, ul };
  };

  // ---- Main ----------------------------------------------------------------

  const query = getQueryFromPage();
  const GYAZO_TOKEN = await ensureGyazoToken();

  // クエリ空 or tokenなしなら何もしない（token入力してない/キャンセル含む）
  if (!GYAZO_TOKEN || !query) return;

  const projectName = scrapbox?.Project?.name;
  if (!projectName) return;

  try {
    // Gyazo検索
    const gyazoUrl =
      `https://api.gyazo.com/api/search?query=${encodeURIComponent(query)}&per=20`;

    const gyazoRes = await gmFetch(gyazoUrl, {
      headers: { Authorization: `Bearer ${GYAZO_TOKEN}` },
    });

    const gyazoData = (await gyazoRes.json()) ?? [];
    if (!Array.isArray(gyazoData) || gyazoData.length === 0) {
      const ui = openResultWindow(`「${query}」検索結果 on /${projectName}`);
      if (ui) ui.ul.insertAdjacentHTML('beforebegin', '<p>Gyazo検索結果がありません。</p>');
      return;
    }

    // Cosense側で「画像ID」を含むページがあるかチェック
    const hits = [];
    for (const item of gyazoData) {
      const imageId = item?.image_id;
      if (!imageId) continue;

      const searchUrl =
        `https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}` +
        `/search/query?q=${encodeURIComponent(imageId)}`;

      const sRes = await gmFetch(searchUrl);
      const sData = await sRes.json();

      if (sData?.count > 0) {
        hits.push(sData);
        console.log('hit:', sData);
      }
    }

    // 結果表示
    const titleText = `「${query}」検索結果 on /${projectName}`;
    const ui = openResultWindow(titleText);
    if (!ui) return;

    if (hits.length === 0) {
      ui.doc.body.insertAdjacentHTML('beforeend', '<p>Cosense内では見つかりませんでした。</p>');
      return;
    }

    for (const element of hits) {
      const imageId = element?.query?.words?.[0];
      const pageTitle = element?.pages?.[0]?.title;
      if (!imageId || !pageTitle) continue;

      const li = ui.doc.createElement('li');
      ui.ul.appendChild(li);

      // Gyazo サムネ
      const imgLink = ui.doc.createElement('a');
      imgLink.href = `https://gyazo.com/${imageId}`;
      imgLink.target = '_blank';
      imgLink.rel = 'noopener noreferrer';

      const img = ui.doc.createElement('img');
      img.src = `https://gyazo.com/${imageId}/raw`;
      img.height = 100;
      img.loading = 'lazy';

      imgLink.appendChild(img);
      li.appendChild(imgLink);

      // 該当ページリンク（まずは先頭1件だけ）
      const ul2 = ui.doc.createElement('ul');
      li.appendChild(ul2);

      const li2 = ui.doc.createElement('li');
      ul2.appendChild(li2);

      const pageLink = ui.doc.createElement('a');
      pageLink.href = `https://scrapbox.io/${projectName}/${encodeURIComponent(pageTitle)}`;
      pageLink.textContent = pageTitle;
      pageLink.target = '_blank';
      pageLink.rel = 'noopener noreferrer';

      li2.appendChild(pageLink);
    }
  } catch (err) {
    console.error(err);
    alert('GSS2: エラーが発生しました（コンソールを確認してください）');
  }
})();
