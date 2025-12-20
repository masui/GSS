// ==UserScript==
// @name         Call Gyazo API
// @namespace    http://tampermonkey.net/
// @version      2025-12-19
// @description  try to take over the world!
// @author       You
// @match        https://scrapbox.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=example.com
// @run-at       context-menu
// @grant GM.xmlHttpRequest
// ==/UserScript==

// Tampermonkeyスクリプト

const GYAZO_TOKEN = "Lf_bYz-8T-QKnI2D3u6olVDeHCDnhnB0OeV5jTEtWps";

function gmFetch(url, options = {}) {
  if (typeof GM !== "undefined" && GM.fetch) {
    return GM.fetch(url, options);
  }

  return new Promise((resolve, reject) => {
    GM.xmlHttpRequest({
      method: options.method || "GET",
      url,
      headers: options.headers,
      data: options.body,
      onload: res => {
        resolve({
          ok: true,
          status: res.status,
          text: () => Promise.resolve(res.responseText),
          data: () => Promise.resolve(JSON.parse(res.responseText))
        });
      },
      onerror: reject
    });
  });
}

// const query = document.querySelector('.form-control').value;
const query = 'abcdefg';

const projectname = scrapbox.Project.name;

// (query + ' ' + projectname);

//<input type="text" class="form-control" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="" value="">

/*
const res = await gmFetch("https://api.gyazo.com/api/search?query="+projectname+'%20'+query, {
  headers: { Authorization: `Bearer ${GYAZO_TOKEN}` }
});
const data = await res.data();
*/

const win = window.open('', '_blank', 'width=800,height=600');
const h1 = win.document.createElement('h1');

win.document.body.append(h1);

h1.textContent = `「${query}」検索結果 (${projectname})`;
//alert(`「${query}」検索結果 (${projectname})`);


/*
const li = win.document.createElement('li');
win.document.append(h1,li);

const p = win.document.createElement('p');
p.textContent = 'document.writeを使わへん例や。';

win.document.append(li,p);
*/

//win.document.body.append(h1, p);


//alert(data[0].metadata.desc);


/*
function get(url) {
  return new Promise((resolve, reject) => {
    const xhr = new GM.xmlHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText); // 成功したらレスポンステキストを解決
      } else {
        reject(new Error(`HTTP error! status: ${xhr.status}`)); // エラーなら拒否
      }
    };
    xhr.onerror = () => {
      reject(new Error('Network error')); // ネットワークエラーなら拒否
    };
    xhr.send(); // リクエスト送信
  });
}

// async関数内で使用
async function fetchData() {
  try {
    const data = await get('https://api.gyazo.com/api/images?query=yuiseki');
    console.log(data); // 取得したデータ
  } catch (error) {
    console.error(error);
  }
}

fetchData();

*/
/*
GM.xmlHttpRequest({
  method: "GET",
  url: "https://api.gyazo.com/api/images?query=yuiseki",
  headers: {
     Authorization: `Bearer ${GYAZO_TOKEN}`
  },
  onload: res => {
    res = JSON.parse(res.responseText);
    alert(res[1].metadata.desc);
  }
})
*/


