// ==UserScript==
// @name         GSS - Gyazo-Scrapbox Search
// @namespace    http://tampermonkey.net/
// @version      2025-12-19
// @description  Gyazo+Scrapbox Search
// @author       Toshiyuki Masui
// @match        https://scrapbox.io/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=example.com
// @run-at       context-menu
// @grant GM.xmlHttpRequest
// @grant GM.setValue
// @grant GM.getValue
// ==/UserScript==

//
// 検索文字列を取得
//
const query = document.querySelector('.form-control').value;

//
// 検索文字列が空だったりする場合GYAZO_TOKEN設定ダイアログを表示
//
var GYAZO_TOKEN = await GM.getValue("GYAZO_TOKEN");
if(GYAZO_TOKEN == undefined || query == ''){
    var s = prompt('GYAZO TOKENを入力してください');
    if (s){
        GM.setValue("GYAZO_TOKEN",s);
        GYAZO_TOKEN = s;
    }
    return;
}

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

const projectname = scrapbox.Project.name;

const res = await gmFetch("https://api.gyazo.com/api/search?query="+projectname+'%20'+query, {
  headers: { Authorization: `Bearer ${GYAZO_TOKEN}` }
});
const data = await res.data();

//
// 検索結果ウィンドウを開いて結果を表示
//
const win = window.open('', '_blank');

const h1 = win.document.createElement('h1');

win.document.body.append(h1);

h1.textContent = `「${query}」検索結果 on /${projectname}`

const ul = win.document.createElement('ul');

win.document.body.append(ul);

console.log(data);

data.forEach((element) => {
    var li = win.document.createElement('li');
    ul.append(li);

    var imga = win.document.createElement('a');
    var img = win.document.createElement('img')
    img.src = element.thumb_url;
    imga.append(img);
    imga.href= element.permalink_url;
    li.append(imga);

    var ul2 = win.document.createElement('ul');
    li.append(ul2);

    element.metadata.desc.split(/\n/).forEach(
       (s) => {
         let m = s.match(new RegExp(`\/${projectname}\/(.*)$`));
         if(m){
            let page = m[1].replace(/%20/g,' ');
            let url = `https://scrapbox.io/${projectname}/${page}`;
            var a = win.document.createElement('a');
            a.href = url;
            a.textContent = page;
            var li2 = win.document.createElement('li');
            li2.append(a);
            ul2.append(li2);
         }
       }
    )
});

