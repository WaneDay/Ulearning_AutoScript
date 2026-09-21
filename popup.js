'use strict';

var BG_OPEN_URLS = [
    'https://ua.dgut.edu.cn/',
    'https://www.ulearning.cn/'
];

document.addEventListener('DOMContentLoaded', function () {
    var statusEl = document.getElementById('status');

    function flash(text) {
        statusEl.textContent = text;
        setTimeout(function () {
            if (statusEl.textContent === text) statusEl.textContent = '';
        }, 2500);
    }

    document.getElementById('openSite').addEventListener('click', function () {
        chrome.tabs.create({ url: BG_OPEN_URLS[0] }, function () {
            window.close();
        });
    });

    document.getElementById('reloadContent').addEventListener('click', function () {
        chrome.runtime.sendMessage({ type: 'reloadContent' }, function (resp) {
            if (chrome.runtime.lastError) {
                flash('失败：' + chrome.runtime.lastError.message);
                return;
            }
            flash(resp && resp.ok ? '已重新加载 ✅' : '失败：' + (resp ? resp.error : '未知'));
        });
    });
});
