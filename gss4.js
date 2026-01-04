// ==UserScript==
// @name         GSS3 - Gyazo-Scrapbox Search (Ctrl-G + Progress)
// @namespace    http://tampermonkey.net/
// @version      2025-12-30
// @description  Gyazo+Scrapbox Search (Ctrl+G, progress indicator)
// @author       Toshiyuki Masui
// @match        https://scrapbox.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=example.com
// @run-at       document-end
// @grant        GM.xmlHttpRequest
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

(() => {
  'use strict';

  // --------------------------------------------------------------------------
  // Ctrl + G で起動（多重起動防止つき）
  // --------------------------------------------------------------------------

  let running = false;

  document.addEventListener('keydown', (e) => {
    if (
      e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey &&
      e.key.toLowerCase() === 'g'
    ) {
      if (running) return;
      e.preventDefault();
      main();
    }
  });

  // --------------------------------------------------------------------------
  // Progress Indicator
  // --------------------------------------------------------------------------

  const showProgress = (text = 'GSS3: 検索中…') => {
    let el = document.getElementById('gss3-progress');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'gss3-progress';
    el.textContent = text;

    Object.assign(el.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 99999,
      padding: '6px 10px',
      background: 'rgba(0,0,0,0.8)',
      color: '#fff',
      fontSize: '12px',
      borderRadius: '6px',
      fontFamily: 'sans-serif',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    });

    document.body.appendChild(el);
    return el;
  };

  const hideProgress = () => {
    document.getElementById('gss3-progress')?.remove();
  };

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Main
  // --------------------------------------------------------------------------

  async function main() {
    running = true;
    const progress = showProgress('GSS3: 準備中…');

    try {
      const query = getQueryFromPage();
      if (!query) return;

      const GYAZO_TOKEN = await ensureGyazoToken();
      if (!GYAZO_TOKEN) return;

      const projectName = scrapbox?.Project?.name;
      if (!projectName) return;

      // --- Gyazo検索 ---------------------------------------------------------

      progress.textContent = 'GSS3: Gyazo検索中…';

      const gyazoUrl =
        `https://api.gyazo.com/api/search?query=${encodeURIComponent(query)}&per=20`;

      const gyazoRes = await gmFetch(gyazoUrl, {
        headers: { Authorization: `Bearer ${GYAZO_TOKEN}` },
      });

      const gyazoData = (await gyazoRes.json()) ?? [];
      if (!Array.isArray(gyazoData) || gyazoData.length === 0) {
        //const ui = openResultWindow(`「${query}」検索結果 on /${projectName}`);
        const ui = openResultWindow(`「${query}」検索結果 on ${document.title}`);
        if (ui) {
          ui.ul.insertAdjacentHTML(
            'beforebegin',
            '<p>Gyazo検索結果がありません。</p>'
          );
        }
        return;
      }

      // --- Cosense検索 -------------------------------------------------------

      const hits = [];
      let index = 0;

      for (const item of gyazoData) {
        index++;
        progress.textContent =
          `GSS3: Cosense検索中… (${index}/${gyazoData.length})`;

        const imageId = item?.image_id;
        if (!imageId) continue;

        const searchUrl =
          `https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}` +
          `/search/query?q=${encodeURIComponent(imageId)}`;

        const sRes = await gmFetch(searchUrl);
        const sData = await sRes.json();

        if (sData?.count > 0) hits.push(sData);
      }

      // --- 結果表示 ----------------------------------------------------------

      progress.textContent = 'GSS3: 結果表示中…';

      //const titleText = `「${query}」検索結果 on /${projectName}`;
      const titleText = `「${query}」検索結果 on ${document.title}`;
      const ui = openResultWindow(titleText);
      if (!ui) return;

      if (hits.length === 0) {
        ui.doc.body.insertAdjacentHTML(
          'beforeend',
          '<p>Cosense内では見つかりませんでした。</p>'
        );
        return;
      }

      for (const element of hits) {
        const imageId = element?.query?.words?.[0];
        if (!imageId) continue;

        // いちばん長いタイトルを採用
        let pageTitle = '';
        for (const page of element.pages) {
          if (page.title.length > pageTitle.length) {
            pageTitle = page.title;
          }
        }
        if (!pageTitle) continue;

        const li = ui.doc.createElement('li');
        ui.ul.appendChild(li);

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

        const ul2 = ui.doc.createElement('ul');
        li.appendChild(ul2);

        const li2 = ui.doc.createElement('li');
        ul2.appendChild(li2);

        const pageLink = ui.doc.createElement('a');
        pageLink.href =
          `https://scrapbox.io/${projectName}/${encodeURIComponent(pageTitle)}`;
        pageLink.textContent = pageTitle;
        pageLink.target = '_blank';
        pageLink.rel = 'noopener noreferrer';

        li2.appendChild(pageLink);
      }
    } catch (err) {
      console.error(err);
      alert('GSS3: エラーが発生しました（コンソールを確認してください）');
    } finally {
      hideProgress();
      running = false;
    }
  }
})();
