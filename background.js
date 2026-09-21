'use strict';

var DEFAULT_PATTERNS = [
    '*://*/learnCourse/*',
    '*://*/ulearning/*',
    '*://ua.dgut.edu.cn/learnCourse/*',
    '*://*.ulearning.cn/learnCourse/*',
    '*://*.ulearning.com/learnCourse/*'
];

var STORAGE_KEY = 'EZUL_MATCH_PATTERNS';
var SCRIPT_ID = 'ezul-main';
var SCRIPT_JS = ['lib/jquery-3.4.1.min.js', 'content.js'];

function loadPatterns() {
    return new Promise(function (resolve) {
        chrome.storage.local.get(STORAGE_KEY, function (data) {
            var list = data[STORAGE_KEY];
            resolve(Array.isArray(list) && list.length > 0 ? list : DEFAULT_PATTERNS);
        });
    });
}

// 串行化内容脚本注册，避免并发调用导致 Duplicate script ID 错误
var registrationChain = Promise.resolve();

function registerContentScript(patterns) {
    registrationChain = registrationChain
        .catch(function () {})
        .then(function () {
            return chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] })
                .catch(function () { /* 未注册过则忽略 */ })
                .then(function () {
                    return chrome.scripting.registerContentScripts([{
                        id: SCRIPT_ID,
                        matches: patterns,
                        js: SCRIPT_JS,
                        runAt: 'document_start'
                    }]);
                });
        });
    return registrationChain;
}

chrome.runtime.onInstalled.addListener(function () {
    loadPatterns().then(registerContentScript).catch(function (error) {
        console.error('[优学院] 安装时注册内容脚本失败:', error);
    });
});

chrome.runtime.onStartup.addListener(function () {
    loadPatterns().then(registerContentScript).catch(function (error) {
        console.error('[优学院] 启动时注册内容脚本失败:', error);
    });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message) return;
    if (message.type === 'reloadContent') {
        loadPatterns()
            .then(registerContentScript)
            .then(function () { sendResponse({ ok: true }); })
            .catch(function (error) {
                sendResponse({ ok: false, error: String(error) });
            });
        return true;
    }
    if (message.type !== 'updateMatches') return;

    var core = String(message.core || '').trim();
    var responseSent = false;

    function reply(obj) {
        if (responseSent) return;
        responseSent = true;
        sendResponse(obj);
    }

    (function () {
        var promise;
        if (core) {
            promise = chrome.storage.local.set({ EZUL_MATCH_PATTERNS: [core] });
        } else {
            promise = chrome.storage.local.remove(STORAGE_KEY);
        }
        promise
            .then(loadPatterns)
            .then(function (patterns) {
                return registerContentScript(patterns).then(function () { return patterns; });
            })
            .then(function (patterns) {
                reply({ ok: true, patterns: patterns });
            })
            .catch(function (error) {
                reply({ ok: false, error: String(error) });
            });
    })();

    return true;
});

// 后台脚本每次启动时确保内容脚本已按配置注册
loadPatterns().then(registerContentScript).catch(function (error) {
    console.error('[优学院] 初始化注册内容脚本失败:', error);
});