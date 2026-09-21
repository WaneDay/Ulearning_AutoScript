(function () {
    'use strict';

    // ============================================================================
    // 全局状态变量
    // ============================================================================

    var autoAnswering = false;
    var checkingModal = false;
    var pageid = '';

    // ============================================================================
    // 配置管理器
    // ============================================================================
    var ConfigManager = {
        defaults: {
            playbackRate: 1.50,
            enableAutoPlay: true,
            enableAutoMute: true,
            enableAutoChangeRate: true,
            enableAutoFillAnswer: true,
            enableAutoShowAnswer: true,
            enableAutoAnswerChoices: true,
            enableAutoAnswerJudges: true,
            enableAutoAnswerFills: true
        },

        current: {},
        storageKey: 'EZUL_CONFIG',

        init: function () {
            console.log('[配置管理器] 初始化...');
            this.loadFromStorage();
            return this;
        },

        loadFromStorage: function () {
            try {
                var savedConfig = localStorage.getItem(this.storageKey);
                if (savedConfig) {
                    this.current = JSON.parse(savedConfig);
                    console.log('[配置管理器] 配置已从本地存储加载');
                } else {
                    if (this.migrateFromOldFormat()) {
                        console.log('[配置管理器] 配置已从旧格式迁移');
                    } else {
                        this.current = Object.assign({}, this.defaults);
                        console.log('[配置管理器] 使用默认配置');
                    }
                }
            } catch (error) {
                console.error('[配置管理器] 加载配置失败:', error);
                this.current = Object.assign({}, this.defaults);
            }
            return this.current;
        },

        migrateFromOldFormat: function () {
            try {
                if (localStorage.getItem('EZUL') !== 'EliotZhang、BrushJIM') {
                    return false;
                }
                console.log('[配置管理器] 检测到旧格式配置，开始迁移...');
                var oldToNewMap = {
                    'EAM': 'enableAutoMute',
                    'EACR': 'enableAutoChangeRate',
                    'EAP': 'enableAutoPlay',
                    'EASA': 'enableAutoShowAnswer',
                    'EAAC': 'enableAutoAnswerChoices',
                    'EAAJ': 'enableAutoAnswerJudges',
                    'EAAF': 'enableAutoAnswerFills',
                    'EAFA': 'enableAutoFillAnswer',
                    'APRC': 'playbackRate'
                };
                var migratedConfig = Object.assign({}, this.defaults);
                var hasMigration = false;
                for (var oldKey in oldToNewMap) {
                    if (oldKey === 'APRC') continue;
                    var newKey = oldToNewMap[oldKey];
                    var oldValue = localStorage.getItem(oldKey);
                    if (oldValue !== null) {
                        migratedConfig[newKey] = (oldValue === 't');
                        hasMigration = true;
                    }
                }
                var playbackRateValue = localStorage.getItem('APRC');
                if (playbackRateValue !== null) {
                    migratedConfig.playbackRate = parseFloat(playbackRateValue) || this.defaults.playbackRate;
                    hasMigration = true;
                }
                if (hasMigration) {
                    this.current = migratedConfig;
                    this.saveToStorage();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('[配置管理器] 迁移旧格式配置失败:', error);
                return false;
            }
        },

        saveToStorage: function () {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.current));
                localStorage.setItem('EZUL', 'EliotZhang、BrushJIM');
                console.log('[配置管理器] 配置已保存到本地存储');
                return true;
            } catch (error) {
                console.error('[配置管理器] 保存配置失败:', error);
                return false;
            }
        },

        get: function (key, defaultValue) {
            return this.current[key] !== undefined ? this.current[key] : defaultValue;
        },

        set: function (key, value) {
            this.current[key] = value;
            return this;
        },

        setAll: function (config) {
            Object.assign(this.current, config);
            return this;
        },

        resetToDefaults: function () {
            this.current = Object.assign({}, this.defaults);
            return this;
        },

        getAll: function () {
            return Object.assign({}, this.current);
        }
    };

    // 初始化配置并导出快捷访问变量
    var config = ConfigManager.init();

    function getConfig(key, defaultValue) {
        return config.get(key, defaultValue);
    }

    var ENABLE_AUTO_PLAY = getConfig('enableAutoPlay', true);
    var ENABLE_AUTO_MUTE = getConfig('enableAutoMute', true);
    var ENABLE_AUTO_CHANGE_RATE = getConfig('enableAutoChangeRate', true);
    var ENABLE_AUTO_FILL_ANSWER = getConfig('enableAutoFillAnswer', true);
    var ENABLE_AUTO_SHOW_ANSWER = getConfig('enableAutoShowAnswer', true);
    var ENABLE_AUTO_ANSWER_CHOICES = getConfig('enableAutoAnswerChoices', true);
    var ENABLE_AUTO_ANSWER_JUDGES = getConfig('enableAutoAnswerJudges', true);
    var ENABLE_AUTO_ANSWER_FILLS = getConfig('enableAutoAnswerFills', true);
    var PLAYBACK_RATE = getConfig('playbackRate', 1.50);

    // ============================================================================
    // 日志管理器
    // ============================================================================
    var Logger = {
        levels: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
        currentLevel: 1,

        setLevel: function (level) {
            if (this.levels[level] !== undefined) {
                this.currentLevel = this.levels[level];
                this.info('[日志管理器] 日志级别设置为:', level);
            }
        },

        debug: function () {
            if (this.currentLevel <= this.levels.DEBUG) {
                console.log.apply(console, ['[优学院-DEBUG]'].concat(Array.prototype.slice.call(arguments)));
            }
        },

        info: function () {
            if (this.currentLevel <= this.levels.INFO) {
                console.log.apply(console, ['[优学院-INFO]'].concat(Array.prototype.slice.call(arguments)));
            }
        },

        warn: function () {
            if (this.currentLevel <= this.levels.WARN) {
                console.warn.apply(console, ['[优学院-WARN]'].concat(Array.prototype.slice.call(arguments)));
            }
        },

        error: function () {
            if (this.currentLevel <= this.levels.ERROR) {
                console.error.apply(console, ['[优学院-ERROR]'].concat(Array.prototype.slice.call(arguments)));
            }
        }
    };

    // ============================================================================
    // API 请求辅助函数（替代原脚本中的同步 AJAX）
    // ============================================================================

    /**
     * 通过 fetch 从 API 获取答案
     * @param {string} questionId - 题目ID
     * @returns {Promise<Array|null>} 答案列表或 null
     */
    async function fetchAnswerFromAPI(questionId) {
        try {
            var url = 'https://api.ulearning.cn/questionAnswer/' + questionId + '?parentId=' + pageid;
            var response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            var result = await response.json();
            if (result.correctAnswerList !== undefined && result.correctAnswerList !== null) {
                return result.correctAnswerList;
            }
            return null;
        } catch (error) {
            console.error('[API] 获取答案失败 questionId=' + questionId + ':', error);
            return null;
        }
    }

    /**
     * 检查 API 是否有指定题目的答案
     * @param {string} questionId - 题目ID
     * @returns {Promise<boolean>}
     */
    async function checkAnswerAvailable(questionId) {
        var answer = await fetchAnswerFromAPI(questionId);
        return answer !== null && answer !== undefined;
    }

    // ============================================================================
    // DOM 答案提取辅助函数
    // ============================================================================

    function RemoveDuplicatedItem(arr) {
        for (var i = 0; i < arr.length - 1; i++) {
            for (var j = i + 1; j < arr.length; j++) {
                if (arr[i] == arr[j]) {
                    arr.splice(j, 1);
                    j--;
                }
            }
        }
        return arr;
    }

    function Escape2Html(str) {
        var arrEntities = { 'lt': '<', 'gt': '>', 'nbsp': ' ', 'amp': '&', 'quot': '"' };
        return str.replace(/&(lt|gt|nbsp|amp|quot);/ig, function (all, t) { return arrEntities[t]; });
    }

    function DelHtmlTag(str) {
        return str.replace(/(<[^>]+>|\\n|\\r)/g, " ");
    }

    /**
     * 从 DOM 中获取题目答案
     * @param {string} questionId - 题目ID
     * @returns {Array|null} 答案数组或 null
     */
    function getAnswerFromDOM(questionId) {
        var maxRetries = 8;
        var retryDelay = 800;

        console.log('开始从DOM获取答案，questionId:', questionId);

        for (var retry = 0; retry < maxRetries; retry++) {
            var selectors = [
                '#question' + questionId + ' .correct-answer-area span:last-child',
                '#question' + questionId + ' .correct-answer-area',
                '#question' + questionId + ' .answer-result-text',
                '.question-wrapper[id="question' + questionId + '"] .correct-answer-area span:last-child',
                '.question-wrapper[id="question' + questionId + '"] .correct-answer-area',
                '.question-wrapper[id="question' + questionId + '"] .answer-result-text',
                '#question' + questionId + ' span[style*="color:"]',
                '.correct-answer-area span:last-child',
                '.correct-answer-area',
                '.answer-result-text .correct-answer-area span:last-child',
                '.answer-result-text',
                '.answer-text',
                '.correct-answer',
                '.answer-content',
                '.result-content',
                '.question-result',
                '.result-text',
                '.correct-text',
                '.right-answer',
                '.right-answer-text',
                '.show-answer',
                '.answer-show',
                '.answer-display'
            ];

            for (var i = 0; i < selectors.length; i++) {
                var domAnswerElement = $(selectors[i]);
                if (domAnswerElement.length > 0) {
                    var domAnswerText = domAnswerElement.text().trim();
                    domAnswerText = domAnswerText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

                    if (domAnswerText.includes('答案：') || domAnswerText.includes('正确答案：') || domAnswerText.includes('参考答案：')) {
                        var extracted = false;
                        var match = domAnswerText.match(/(?:答案|正确答案|参考答案)：\s*([^\s](?:.*[^\s])?)/);
                        if (match && match[1]) {
                            domAnswerText = match[1].trim();
                            extracted = true;
                        }
                        if (!extracted || domAnswerText === '正确答案：' || domAnswerText === '答案：') {
                            var childElements = domAnswerElement.find('span, div, p, strong, b, em, i');
                            if (childElements.length > 0) {
                                var childText = '';
                                childElements.each(function () {
                                    var text = $(this).text().trim();
                                    if (text && text !== '正确答案：' && text !== '答案：' && text !== '参考答案：') {
                                        childText += text + ' ';
                                    }
                                });
                                childText = childText.trim();
                                if (childText) { domAnswerText = childText; extracted = true; }
                            }
                        }
                        if (!extracted || domAnswerText === '正确答案：' || domAnswerText === '答案：') {
                            var htmlContent = domAnswerElement.html().trim();
                            var cleanText = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                            cleanText = cleanText.replace(/(?:答案|正确答案|参考答案)：\s*/g, '').trim();
                            if (cleanText && cleanText !== '正确答案：' && cleanText !== '答案：') {
                                domAnswerText = cleanText;
                                extracted = true;
                            }
                        }
                        if (!extracted || domAnswerText === '正确答案：' || domAnswerText === '答案：') {
                            var nextSiblings = domAnswerElement.nextAll('span, div, p');
                            if (nextSiblings.length > 0) {
                                var siblingText = '';
                                nextSiblings.each(function () {
                                    var text = $(this).text().trim();
                                    if (text && !text.includes('正确答案：') && !text.includes('答案：')) {
                                        siblingText += text + ' ';
                                    }
                                });
                                siblingText = siblingText.trim();
                                if (siblingText) { domAnswerText = siblingText; extracted = true; }
                            }
                        }
                    }

                    if (!domAnswerText) {
                        domAnswerText = domAnswerElement.html().trim();
                    }

                    if (!domAnswerText) continue;
                    if (domAnswerText === '正确答案：' || domAnswerText === '答案：' || domAnswerText === '参考答案：') continue;

                    // 判断题答案
                    if (domAnswerText === '正确' || domAnswerText === '对' || domAnswerText === 'True' || domAnswerText === 'true') {
                        return ['true'];
                    } else if (domAnswerText === '错误' || domAnswerText === '错' || domAnswerText === 'False' || domAnswerText === 'false') {
                        return ['false'];
                    } else if (domAnswerText.length === 1 && /^[A-Z]$/.test(domAnswerText)) {
                        return [domAnswerText];
                    } else if (domAnswerText.includes(',') && /^[A-Z,\s]+$/i.test(domAnswerText)) {
                        var answers = domAnswerText.split(',').map(function (item) {
                            return item.trim().toUpperCase();
                        }).filter(function (item) {
                            return /^[A-D]$/.test(item);
                        });
                        return answers;
                    } else if (domAnswerText.length > 1 && /^[A-Z]+$/.test(domAnswerText)) {
                        return domAnswerText.split('');
                    } else if (/^[A-D]$/i.test(domAnswerText)) {
                        return [domAnswerText.toUpperCase()];
                    } else if (/^[A-D]+$/i.test(domAnswerText)) {
                        return domAnswerText.toUpperCase().split('');
                    } else {
                        return [domAnswerText];
                    }
                }
            }

            // 备用方案：查找包含答案关键词的元素
            var answerElements = $(':contains("答案："), :contains("正确答案："), :contains("参考答案：")');
            if (answerElements.length > 0) {
                var questionContainer = $('#question' + questionId + ', .question-wrapper[id="question' + questionId + '"]');
                var relevantElements = answerElements.filter(function () {
                    return questionContainer.length === 0 || $(this).closest(questionContainer).length > 0;
                });
                if (relevantElements.length > 0) {
                    var answerElement = relevantElements.first();
                    var fullText = answerElement.text().trim();
                    var match = fullText.match(/(?:答案|正确答案|参考答案)：\s*([^\s](?:.*[^\s])?)/);
                    if (match && match[1]) {
                        var extractedAnswer = match[1].trim();
                        if (extractedAnswer === '正确' || extractedAnswer === '对') return ['true'];
                        if (extractedAnswer === '错误' || extractedAnswer === '错') return ['false'];
                        if (extractedAnswer.includes(',') && /^[A-Z,\s]+$/i.test(extractedAnswer)) {
                            var answers = extractedAnswer.split(',').map(function (item) {
                                return item.trim().toUpperCase();
                            }).filter(function (item) { return /^[A-D]$/.test(item); });
                            return answers;
                        }
                        if (/^[A-Z]+$/.test(extractedAnswer)) return extractedAnswer.split('');
                        if (/^[A-D]+$/i.test(extractedAnswer)) return extractedAnswer.toUpperCase().split('');
                        return [extractedAnswer];
                    }
                }
            }

            if (retry < maxRetries - 1) {
                var start = Date.now();
                while (Date.now() - start < retryDelay) { /* 等待 DOM 更新 */ }
            }
        }

        console.log('未能在DOM中找到答案，questionId:', questionId);
        return null;
    }

    // ============================================================================
    // 题目状态检查函数
    // ============================================================================

    function isQuestionCompleted(questionElement) {
        if (!questionElement) return false;

        var text = $(questionElement).text();
        if (text.includes('回答正确')) return true;

        if ($(questionElement).hasClass('finished')) {
            var hasSelectedAnswer = false;
            var selectedCheckboxes = $(questionElement).find('.checkbox.selected');
            if (selectedCheckboxes.length > 0) hasSelectedAnswer = true;
            var selectedChoiceBtns = $(questionElement).find('.choice-btn.selected');
            if (selectedChoiceBtns.length > 0) hasSelectedAnswer = true;
            var filledInputs = $(questionElement).find('textarea, .blank-input, input[type="text"]').filter(function () {
                return $(this).val().trim().length > 0;
            });
            if (filledInputs.length > 0) hasSelectedAnswer = true;
            if (hasSelectedAnswer) return true;
        }
        return false;
    }

    function getUnfinishedQuestions() {
        var unfinished = [];
        $('.question-wrapper').each(function (k, v) {
            if (!isQuestionCompleted(v)) unfinished.push(v);
        });
        return unfinished;
    }

    // ============================================================================
    // 填空/简答题自动填充（异步版本）
    // ============================================================================

    async function fillAnswersAsync() {
        if (!autoAnswering || !ENABLE_AUTO_ANSWER_FILLS) return;

        var idList = [];
        var re = [];
        var txtAreas = $('textarea, .blank-input');

        $(txtAreas).each(function (k, v) {
            var reg = /question\d+/;
            var fa = $(v).parent();
            while (!reg.test($(fa).attr('id'))) {
                fa = $(fa).parent();
            }
            var id = $(fa).attr('id').replace('question', '');
            idList.push(id);
        });
        idList = RemoveDuplicatedItem(idList);

        // 并发获取所有答案
        var fetchPromises = [];
        for (var i = 0; i < idList.length; i++) {
            fetchPromises.push(fetchAnswerFromAPI(idList[i]));
        }
        var results = await Promise.all(fetchPromises);

        for (var j = 0; j < results.length; j++) {
            var v1 = results[j];
            if (v1 === null || v1 === undefined) {
                re.push([]);
                continue;
            }
            if (v1.length == 1) {
                re.push([DelHtmlTag(Escape2Html(v1[0]))]);
            } else {
                var group = [];
                for (var m = 0; m < v1.length; m++) {
                    group.push(DelHtmlTag(Escape2Html(v1[m])));
                }
                re.push(group);
            }
        }

        var ansarr = [];
        $(re).each(function (k1, v1) {
            if (v1.length == 1) {
                ansarr.push(v1[0]);
            } else {
                $(v1).each(function (k2, v2) { ansarr.push(v2); });
            }
        });

        $(txtAreas).each(function (k, v) {
            var val = ansarr.shift();
            if (val !== undefined) $(v).val(val);
        });

        // 触发 change 事件
        $('textarea, .blank-input').each(function () {
            var event = new Event('change', { bubbles: true });
            this.dispatchEvent(event);
        });
    }

    // ============================================================================
    // 翻页函数
    // ============================================================================

    function GotoNextPage() {
        if (autoAnswering || !ENABLE_AUTO_PLAY || checkingModal) return;

        var qw = $('.question-wrapper');
        if (qw.length > 0) {
            var unfinishedQuestions = qw.not('.finished');
            if (unfinishedQuestions.length > 0) {
                Logger.info('有未完成题目，不翻页');
                if (ENABLE_AUTO_FILL_ANSWER) {
                    Logger.info('自动答题已启用，开始答题');
                    showAndFillAnswerAsync();
                }
                return;
            }
        }

        var nextPageBtn = $('.mobile-next-page-btn');
        if (nextPageBtn.length === 0) return;
        Logger.info('翻页到下一节');
        nextPageBtn.each(function (k, n) { n.click(); });
        setTimeout(Video, 1000);
    }

    // ============================================================================
    // 视频控制函数
    // ============================================================================

    function Video(func, slept) {
        func = func || {};
        slept = slept || false;

        if (!ENABLE_AUTO_PLAY) return;
        if (autoAnswering) {
            setTimeout(function () { Video({}, true); }, 1000);
            return;
        }
        if (!slept) {
            setTimeout(function () { Video({}, true); }, 3000);
            return;
        }

        var videoElementsTemp = $('video');
        var videoElements = [];
        for (var i = 0; i < videoElementsTemp.length; i++) {
            if (videoElementsTemp[i].src != "") {
                videoElements.push(videoElementsTemp[i]);
            }
        }

        if (videoElements.length === 0) {
            var qw = $('.question-wrapper');
            if (qw.length > 0 && ENABLE_AUTO_FILL_ANSWER) {
                Logger.info('没有视频，但有题目，先处理题目');
                showAndFillAnswerAsync();
            } else {
                GotoNextPage();
            }
            return;
        }

        var videoStatus = [];
        var videoBottomElements = $('div[class="video-bottom"]');
        for (var i = 0; i < videoBottomElements.length; i++) {
            var span = videoBottomElements[i].getElementsByTagName("span")[0];
            if (span) {
                var data_bind = span.getAttribute('data-bind');
                if (data_bind == 'text: $root.i18nMessageText().finished' ||
                    data_bind == 'text: $root.i18nMessageText().viewed' ||
                    data_bind == 'text: $root.i18nMessageText().unviewed') {
                    videoStatus.push(data_bind);
                }
            }
        }

        function video_ctrl(func) {
            for (var i = 0; i < videoElements.length; i++) {
                if (videoStatus[i] == 'text: $root.i18nMessageText().viewed' ||
                    videoStatus[i] == 'text: $root.i18nMessageText().unviewed' ||
                    videoStatus[i] === false) {
                    if (i - 1 >= 0) {
                        if (videoElements[i - 1].currentTime != 0) {
                            if (videoElements[i - 1].paused === true) videoElements[i - 1].play();
                            if (ENABLE_AUTO_MUTE && videoElements[i - 1].muted === false) videoElements[i - 1].muted = true;
                            if (ENABLE_AUTO_CHANGE_RATE && videoElements[i - 1].playbackRate != PLAYBACK_RATE) videoElements[i - 1].playbackRate = PLAYBACK_RATE;
                            break;
                        }
                    }
                    if (videoElements[i].paused === true) videoElements[i].play();
                    if (ENABLE_AUTO_MUTE && videoElements[i].muted === false) videoElements[i].muted = true;
                    if (ENABLE_AUTO_CHANGE_RATE && videoElements[i].playbackRate != PLAYBACK_RATE) videoElements[i].playbackRate = PLAYBACK_RATE;
                    break;
                }
            }
            if (videoStatus[videoStatus.length - 1] == 'text: $root.i18nMessageText().finished' ||
                videoStatus[videoStatus.length - 1] === true) {
                if (videoElements[videoElements.length - 1].currentTime != 0) {
                    if (videoElements[videoElements.length - 1].paused === true) videoElements[videoElements.length - 1].play();
                    if (ENABLE_AUTO_MUTE && videoElements[videoElements.length - 1].muted === false) videoElements[videoElements.length - 1].muted = true;
                    if (ENABLE_AUTO_CHANGE_RATE && videoElements[videoElements.length - 1].playbackRate != PLAYBACK_RATE) videoElements[videoElements.length - 1].playbackRate = PLAYBACK_RATE;
                    setTimeout(func, 2000, func);
                } else {
                    GotoNextPage();
                }
            } else {
                setTimeout(func, 2000, func);
            }
        }

        if (videoElements.length == videoStatus.length) {
            video_ctrl(Video);
        } else {
            videoStatus = [];
            for (var i = 0; i < videoElements.length; i++) {
                videoStatus[i] = false;
                (function (idx) {
                    videoElements[idx].addEventListener("ended", function () {
                        videoStatus[idx] = true;
                    }, true);
                })(i);
            }
            video_ctrl(video_ctrl);
        }
    }

    // ============================================================================
    // 模态框检查函数
    // ============================================================================

    function CheckModal(slept) {
        slept = slept || false;
        if (autoAnswering) return;
        if (!slept) {
            setTimeout(function () { CheckModal(true); }, 5000);
            return;
        }
        checkingModal = true;
        var qw = $('.question-wrapper');
        if (qw.length > 0 && ENABLE_AUTO_FILL_ANSWER) {
            showAndFillAnswerAsync();
            checkingModal = false;
            return;
        }
        var statModal = $('#statModal');
        if (statModal.length > 0) {
            var ch = statModal[0].getElementsByTagName('button');
            if (ch.length >= 2) ch[1].click();
        }
        var err = $('.mobile-video-error');
        if (err && err.css('display') != 'none') $('.try-again').click();
        var alertModal = document.getElementById("alertModal");
        if (!alertModal) { checkingModal = false; return; }
        if (alertModal.className.match(/\sin/)) {
            var modalType = 'unknown';
            var incompleteDiv = $('div[data-bind*="modalType() == \'incomplete\'"]');
            if (incompleteDiv.length > 0) {
                modalType = 'incomplete';
                Logger.info('检测到题目未完成提示框');
            }
            if (modalType === 'incomplete') {
                var op = $('.modal-operation').children();
                if (op.length >= 2) {
                    Logger.info('点击"留在本页"按钮');
                    op[0].click();
                    setTimeout(function () { ensureQuestionsCompleted(); }, 1000);
                }
            } else {
                var op2 = $('.modal-operation').children();
                if (op2.length >= 2)
                    op2[ENABLE_AUTO_FILL_ANSWER ? 0 : 1].click();
                else {
                    var continueBtn = $('.btn-submit');
                    if (continueBtn.length > 0) {
                        continueBtn.each(function (k, v) {
                            if ($(v).text() != '提交') $(v).click();
                        });
                    }
                }
                if (ENABLE_AUTO_FILL_ANSWER) showAndFillAnswerAsync();
            }
        }
        checkingModal = false;
    }

    function ensureQuestionsCompleted() {
        Logger.info('确保题目完成');
        if (autoAnswering || !ENABLE_AUTO_FILL_ANSWER) return;
        var allQuestions = $('.question-wrapper');
        if (allQuestions.length === 0) return;

        var unfinishedQuestions = getUnfinishedQuestions();
        Logger.info('题目统计：总共', allQuestions.length, '个，未完成', unfinishedQuestions.length, '个');

        if (unfinishedQuestions.length > 0) {
            Logger.info('发现未完成题目，开始答题');
            showAndFillAnswerAsync();
        } else {
            Logger.info('所有题目已完成');
            var submitBtn = $('.btn-submit:contains("提交")');
            if (submitBtn.length > 0) {
                Logger.info('点击提交按钮');
                submitBtn.click();
            }
        }
    }

    // ============================================================================
    // 异步版本的答题流程
    // ============================================================================

    /**
     * 获取当前页面的 pageid
     */
    function getCurrentPageId() {
        var pages = $('.page-item');
        var found = false;
        pages.each(function (k, v) {
            if (found) return;
            var sp = $(v).find('.page-name');
            if (sp.length > 0 && sp[0].className.search('active') >= 0) {
                var pd = $(v).attr('id');
                pd = pd.slice(pd.search(/\d/g));
                pageid = pd;
                found = true;
            }
        });
        return found;
    }

    /**
     * 初次提交以获取答案（异步版本）
     */
    async function performInitialSubmissionAsync(qw, sqList) {
        Logger.info('执行初次提交');

        var checkBox = qw.find('.checkbox');
        var choiceBox = qw.find('.choice-btn');

        if (checkBox.length > 0) {
            Logger.info('发现选择题，点击第一个选项');
            var firstCheckbox = checkBox.first();
            if (firstCheckbox.length > 0 && !firstCheckbox.hasClass('selected')) {
                firstCheckbox.click();
            }
        }

        if (choiceBox.length > 0) {
            Logger.info('发现判断题，点击"正确"');
            var firstChoice = choiceBox.first();
            if (firstChoice.length > 0) firstChoice.click();
        }

        if (ENABLE_AUTO_ANSWER_FILLS) {
            var txtAreas = $('textarea, .blank-input');
            if (txtAreas.length > 0) {
                Logger.info('发现填空/简答题，填写默认内容');
                txtAreas.each(function (k, v) { $(v).val('答案'); });
                $('textarea, .blank-input').each(function () {
                    var event = new Event('change', { bubbles: true });
                    this.dispatchEvent(event);
                });
            }
        }

        if (ENABLE_AUTO_PLAY) {
            Logger.info('已选择答案，等待1秒让页面处理...');
            var waitStart = Date.now();
            while (Date.now() - waitStart < 1000) { /* 等待 */ }

            $('textarea, .blank-input').each(function () {
                var event = new Event('change', { bubbles: true });
                this.dispatchEvent(event);
            });

            var submitBtns = $('.btn-submit:contains("提交")');
            if (submitBtns.length > 0) {
                submitBtns.click();
            } else {
                $('.btn-submit').click();
            }
            console.log('初次提交完成，等待答案出现');

            autoAnswering = false;
            setTimeout(function () {
                console.log('等待结束，重新检查答案');
                setTimeout(function () { showAndFillAnswerAsync(); }, 1500);
            }, 5000);
        } else {
            autoAnswering = false;
        }
    }

    /**
     * 正确答案流程（异步版本）
     */
    async function performCorrectAnswerFlowAsync(qw, sqList, an) {
        console.log('开始正确答案流程');

        // 过滤已完成的题目
        var filteredQuestions = [];
        var filteredIds = [];
        qw.each(function (k, v) {
            if (!isQuestionCompleted(v)) {
                filteredQuestions.push(v);
                var id = $(v).attr('id');
                if (id) filteredIds.push(id.replace('question', ''));
            }
        });

        if (filteredQuestions.length === 0) {
            console.log('所有题目已完成，无需处理');
            autoAnswering = false;
            return;
        }

        qw = $(filteredQuestions);
        sqList = filteredIds;
        console.log('正确答案流程：处理', sqList.length, '个未完成题目');

        // 异步获取所有答案
        an = [];
        for (var i = 0; i < sqList.length; i++) {
            var id = sqList[i];
            var answer = await fetchAnswerFromAPI(id);
            if (answer === null || answer === undefined) {
                answer = getAnswerFromDOM(id);
            }
            an.push(answer);
        }

        // 检查重做按钮
        var redoSelectors = [
            '.btn-redo', '.redo-btn', '.btn-reset', '.reset-btn',
            '.btn-redo-question', '.question-redo', '[data-bind*="redo"]',
            '[onclick*="redo"]', 'button:contains("重做")', 'a:contains("重做")',
            'span:contains("重做")', 'div:contains("重做")',
            '.question-wrapper .btn', '.question-footer .btn'
        ];

        var redoButtons = null;
        var foundSelector = null;
        for (var i = 0; i < redoSelectors.length; i++) {
            var buttons = $(redoSelectors[i]);
            if (buttons.length > 0) {
                redoButtons = buttons;
                foundSelector = redoSelectors[i];
                break;
            }
        }

        var completedQuestions = $('.question-wrapper.finished');
        var allFinished = completedQuestions.length === qw.length;
        var hasCorrectText = false;
        qw.each(function (k, v) {
            if ($(v).text().includes('回答正确')) hasCorrectText = true;
        });
        var shouldForceRedo = allFinished && !hasCorrectText && redoButtons && redoButtons.length > 0;

        if ((filteredQuestions.length > 0 || shouldForceRedo) && redoButtons && redoButtons.length > 0) {
            console.log('发现重做按钮，点击重置题目');
            redoButtons.each(function (k, btn) { btn.click(); });

            var start = Date.now();
            while (Date.now() - start < 2000) { /* 等待 */ }

            var allQuestionsAfterReset = $('.question-wrapper');
            var newFilteredQuestions = [];
            var newFilteredIds = [];
            allQuestionsAfterReset.each(function (k, v) {
                if (!isQuestionCompleted(v)) {
                    newFilteredQuestions.push(v);
                    var id = $(v).attr('id');
                    if (id) newFilteredIds.push(id.replace('question', ''));
                }
            });

            if (newFilteredQuestions.length === 0) {
                console.log('重置后所有题目已完成');
                autoAnswering = false;
                return;
            }

            qw = $(newFilteredQuestions);
            sqList = newFilteredIds;

            an = [];
            for (var j = 0; j < sqList.length; j++) {
                var id2 = sqList[j];
                var answer2 = await fetchAnswerFromAPI(id2);
                if (answer2 === null || answer2 === undefined) {
                    answer2 = getAnswerFromDOM(id2);
                }
                an.push(answer2);
            }
        }

        // 显示答案
        if (ENABLE_AUTO_SHOW_ANSWER) {
            var t = qw.find('.question-title-html');
            var anCopy = an.slice();
            t.each(function (k, v) {
                var ans = anCopy.shift();
                if (ans === undefined || ans === null) {
                    var questionWrapper = $(v).closest('.question-wrapper');
                    if (questionWrapper.length > 0) {
                        var questionId = questionWrapper.attr('id');
                        if (questionId) {
                            var idMatch = questionId.match(/question(\d+)/);
                            if (idMatch && idMatch[1]) {
                                ans = getAnswerFromDOM(idMatch[1]);
                            }
                        }
                    }
                }
                var displayText = ans;
                if (ans === undefined || ans === null) {
                    displayText = '未知';
                } else if (Array.isArray(ans)) {
                    displayText = ans.join(', ');
                }
                $(v).after('<span style="color:red;">答案：' + displayText + '</span>');
                anCopy.push(ans);
            });
        }

        // 根据答案选择选项
        var checkBox = qw.find('.checkbox');
        if (checkBox.length === 0) {
            checkBox = qw.find('[role="button"], .choice-item, .option-item, .text, .content-wrapper, .choice-option');
        }
        var choiceBox = qw.find('.choice-btn');
        if (choiceBox.length === 0) {
            choiceBox = qw.find('.judge-btn, .true-false-btn, [data-bind*="choice"]');
        }

        var checkList = [];
        var lasOffsetP = '';
        checkBox.each(function (k, cb) {
            var offsetParentId = $(cb).offsetParent().attr('id');
            if (lasOffsetP == offsetParentId) {
                checkList[checkList.length - 1].push(cb);
            } else {
                var l = []; l.push(cb); checkList.push(l);
                lasOffsetP = offsetParentId;
            }
        });

        var choiceList = [];
        lasOffsetP = '';
        choiceBox.each(function (k, cb) {
            var offsetParentId = $(cb).offsetParent().attr('id');
            if (lasOffsetP == offsetParentId) {
                choiceList[choiceList.length - 1].push(cb);
            } else {
                var l = []; l.push(cb); choiceList.push(l);
                lasOffsetP = offsetParentId;
            }
        });

        // 应用答案
        an.forEach(function (a, index) {
            if (a == null || a == undefined || a.length <= 0) return;

            if (a[0].match(/[A-Z]/i) && a[0].length == 1 && ENABLE_AUTO_ANSWER_CHOICES) {
                if (checkList.length === 0) return;
                var cb = checkList.shift();
                a.forEach(function (aa) {
                    var charCode = aa.toUpperCase().charCodeAt(0);
                    var optionIndex = charCode - 65;
                    var cccb = $(cb[optionIndex]);
                    if (cccb[0] === undefined) {
                        console.error('选项' + aa + '不存在');
                    } else if (cccb[0].className.search('selected') < 0) {
                        cccb.click();
                    }
                });
            } else if (a[0].match(/(([tT][rR][uU][eE])|([fF][aA][lL][sS][eE]))/) && ENABLE_AUTO_ANSWER_JUDGES) {
                if (choiceList.length === 0) return;
                var ccb = choiceList.shift();
                a.forEach(function (aa) {
                    if (aa.match(/([tT][rR][uU][eE])/)) {
                        ccb[0].click();
                    } else {
                        ccb[1].click();
                    }
                });
            }
        });

        // 填空和简答题
        if (ENABLE_AUTO_ANSWER_FILLS) {
            await fillAnswersAsync();
        }

        // 提交正确答案
        if (ENABLE_AUTO_PLAY) {
            console.log('所有答案已选择，等待3秒让页面处理...');
            var waitStart = Date.now();
            while (Date.now() - waitStart < 3000) { /* 等待 */ }

            $('textarea, .blank-input').each(function () {
                var event = new Event('change', { bubbles: true });
                this.dispatchEvent(event);
            });

            var submitBtns = $('.btn-submit:contains("提交")');
            if (submitBtns.length > 0) {
                Logger.info('找到提交按钮，点击提交正确答案');
                submitBtns.click();
            } else {
                $('.btn-submit').click();
            }
            console.log('正确答案已提交');

            autoAnswering = false;
            var checkCount = 0;
            var maxChecks = 6;
            var checkInterval = 2000;

            function checkAndNavigate() {
                checkCount++;
                console.log('检查题目完成状态，第' + checkCount + '次');

                var qw = $('.question-wrapper');
                if (qw.length === 0) {
                    console.log('没有题目，尝试翻页');
                    GotoNextPage();
                    return;
                }

                var completedQuestions = $('.question-wrapper.finished');
                var allCompleted = completedQuestions.length === qw.length;
                var correctTextFound = false;
                qw.each(function (k, v) {
                    if ($(v).text().includes('回答正确')) correctTextFound = true;
                });

                if (allCompleted || correctTextFound) {
                    console.log('题目已完成，准备翻页');
                    GotoNextPage();
                } else if (checkCount < maxChecks) {
                    setTimeout(checkAndNavigate, checkInterval);
                } else {
                    console.log('等待超时，尝试翻页');
                    GotoNextPage();
                }
            }

            setTimeout(checkAndNavigate, 3000);
            return;
        }
        autoAnswering = false;
    }

    /**
     * 主答题流程入口（异步版本）
     */
    async function showAndFillAnswerAsync() {
        if (autoAnswering || !ENABLE_AUTO_FILL_ANSWER) return;
        autoAnswering = true;

        // 获取 pageid
        if (!getCurrentPageId()) {
            autoAnswering = false;
            GotoNextPage();
            return;
        }

        var allQuestions = $('.question-wrapper');
        if (allQuestions.length <= 0) {
            autoAnswering = false;
            return;
        }

        var unfinishedQuestions = getUnfinishedQuestions();
        Logger.info('题目统计：总共', allQuestions.length, '个，未完成', unfinishedQuestions.length, '个');

        if (unfinishedQuestions.length === 0) {
            Logger.info('所有题目已完成，跳过处理');
            autoAnswering = false;
            var submitBtn = $('.btn-submit:contains("提交")');
            if (submitBtn.length > 0) {
                Logger.info('检测到提交按钮，点击提交确保完成');
                submitBtn.click();
                setTimeout(GotoNextPage, 2000);
            } else {
                GotoNextPage();
            }
            return;
        }

        var qw = $(unfinishedQuestions);
        var sqList = [];
        qw.each(function (k, v) {
            var id = $(v).attr('id');
            if (id) sqList.push(id.replace('question', ''));
        });

        // 检查是否有答案
        var hasAnswer = false;
        if (sqList.length > 0) {
            hasAnswer = await checkAnswerAvailable(sqList[0]);
            if (!hasAnswer) {
                var domAnswer = getAnswerFromDOM(sqList[0]);
                if (domAnswer !== null) hasAnswer = true;
            }
        }

        Logger.info('答案检查结果：', hasAnswer ? '有答案' : '无答案');

        if (!hasAnswer) {
            Logger.info('无答案，执行初次提交以获取答案');
            await performInitialSubmissionAsync(qw, sqList);
        } else {
            console.log('有答案，进行正确答案流程');
            await performCorrectAnswerFlowAsync(qw, sqList, []);
        }
    }

    // ============================================================================
    // UI 面板绘制
    // ============================================================================

    function DrawOptionPanel() {
        // 主题 CSS 变量（跟随系统 + 手动切换）
        var themeStyle = document.createElement('style');
        themeStyle.type = 'text/css';
        themeStyle.id = 'ezul-theme-style';
        themeStyle.textContent = [
            ':root {',
            '  --ezul-primary: #ea5947;',
            '  --ezul-primary-hover: #ee7a6c;',
            '  --ezul-primary-active: #ca3725;',
            '  --ezul-primary-soft: #fff0ef;',
            '  --ezul-bg: #ffffff;',
            '  --ezul-border: #e3e3e9;',
            '  --ezul-border-strong: #cbcbd1;',
            '  --ezul-field-bg: #efeff7;',
            '  --ezul-field-hover: #f4f4fa;',
            '  --ezul-link-hover-bg: rgba(239,239,247,.7);',
            '  --ezul-text: #444444;',
            '  --ezul-text-secondary: #969696;',
            '  --ezul-header-fg: #444444;',
            '  --ezul-shadow: 0 2px 8px rgba(0,0,0,.15);',
            '  --ezul-shadow-lg: 0 8px 24px rgba(0,0,0,.18);',
            '  --ezul-danger: #f45642;',
            '  --ezul-danger-bg: #feeeee;',
            '  --ezul-scrollbar-track: transparent;',
            '  --ezul-scrollbar-thumb: rgba(203,203,209,.5);',
            '  --ezul-ball-bg: #ffffff;',
            '  --ezul-ball-text: #444444;',
            '}',
            '.ezul-theme-light {',
            '  --ezul-primary: #ea5947;',
            '  --ezul-primary-hover: #ee7a6c;',
            '  --ezul-primary-active: #ca3725;',
            '  --ezul-primary-soft: #fff0ef;',
            '  --ezul-bg: #ffffff;',
            '  --ezul-border: #e3e3e9;',
            '  --ezul-border-strong: #cbcbd1;',
            '  --ezul-field-bg: #efeff7;',
            '  --ezul-field-hover: #f4f4fa;',
            '  --ezul-link-hover-bg: rgba(239,239,247,.7);',
            '  --ezul-text: #444444;',
            '  --ezul-text-secondary: #969696;',
            '  --ezul-header-fg: #444444;',
            '  --ezul-shadow: 0 2px 8px rgba(0,0,0,.15);',
            '  --ezul-shadow-lg: 0 8px 24px rgba(0,0,0,.18);',
            '  --ezul-danger: #f45642;',
            '  --ezul-danger-bg: #feeeee;',
            '  --ezul-scrollbar-track: transparent;',
            '  --ezul-scrollbar-thumb: rgba(203,203,209,.5);',
            '  --ezul-ball-bg: #ffffff;',
            '  --ezul-ball-text: #444444;',
            '}',
            '.ezul-theme-dark {',
            '  --ezul-primary: #ea5947;',
            '  --ezul-primary-hover: #ee7a6c;',
            '  --ezul-primary-active: #ca3725;',
            '  --ezul-primary-soft: #402322;',
            '  --ezul-bg: #2b2b2b;',
            '  --ezul-border: #404040;',
            '  --ezul-border-strong: #555555;',
            '  --ezul-field-bg: #3a3a3a;',
            '  --ezul-field-hover: #434343;',
            '  --ezul-link-hover-bg: rgba(255,255,255,.06);',
            '  --ezul-text: #f0f0f0;',
            '  --ezul-text-secondary: #aaaaaa;',
            '  --ezul-header-fg: #f0f0f0;',
            '  --ezul-shadow: 0 2px 8px rgba(0,0,0,.45);',
            '  --ezul-shadow-lg: 0 8px 24px rgba(0,0,0,.55);',
            '  --ezul-danger: #ff7a6c;',
            '  --ezul-danger-bg: #40201e;',
            '  --ezul-scrollbar-track: #2b2b2b;',
            '  --ezul-scrollbar-thumb: #555555;',
            '  --ezul-ball-bg: #ffffff;',
            '  --ezul-ball-text: #1a1a1a;',
            '}',
            '@media (prefers-color-scheme: dark) {',
            '  :root:not(.ezul-theme-light):not(.ezul-theme-dark) {',
            '    --ezul-primary: #ea5947;',
            '    --ezul-primary-hover: #ee7a6c;',
            '    --ezul-primary-active: #ca3725;',
            '    --ezul-primary-soft: #402322;',
            '    --ezul-bg: #2b2b2b;',
            '    --ezul-border: #404040;',
            '    --ezul-border-strong: #555555;',
            '    --ezul-field-bg: #3a3a3a;',
            '    --ezul-field-hover: #434343;',
            '    --ezul-link-hover-bg: rgba(255,255,255,.06);',
            '    --ezul-text: #f0f0f0;',
            '    --ezul-text-secondary: #aaaaaa;',
            '    --ezul-header-fg: #f0f0f0;',
            '    --ezul-shadow: 0 2px 8px rgba(0,0,0,.45);',
            '    --ezul-shadow-lg: 0 8px 24px rgba(0,0,0,.55);',
            '    --ezul-danger: #ff7a6c;',
            '    --ezul-danger-bg: #40201e;',
            '    --ezul-scrollbar-track: #2b2b2b;',
            '    --ezul-scrollbar-thumb: #555555;',
            '    --ezul-ball-bg: #ffffff;',
            '    --ezul-ball-text: #1a1a1a;',
            '  }',
            '}'
        ].join('\n');
        document.head.appendChild(themeStyle);

        // WinUI 3 Fluent Design 组件样式
        var style = document.createElement('style');
        style.type = 'text/css';
        style.textContent = [
            '.OptionPanel { position: fixed; top: 20px; right: 20px; z-index: 999999; font-family: "PingFangSC", "Helvetica Neue", "Microsoft YaHei", Arial, sans-serif; font-size: 14px; user-select: none; }',
            '.DragBall { width: 44px; height: 44px; border-radius: 50%; background: var(--ezul-bg); border: 1px solid var(--ezul-border); color: var(--ezul-text); display: flex; align-items: center; justify-content: center; cursor: move; box-shadow: var(--ezul-shadow); transition: all 0.2s ease; }',
            '.DragBall img { width: 26px; height: 26px; border-radius: 50%; pointer-events: none; }',
            '.DragBall:hover { transform: scale(1.06); box-shadow: var(--ezul-shadow-lg); border-color: var(--ezul-primary); }',
            '.MainPanel { position: relative; background: var(--ezul-bg); border: 1px solid var(--ezul-border); border-radius: 4px; box-shadow: var(--ezul-shadow-lg); width: 260px; max-height: 80vh; overflow-y: auto; overflow-x: hidden; margin-bottom: 10px; }',
            '.MainPanel::before { content: ""; display: block; height: 4px; background: var(--ezul-primary); border-radius: 4px 4px 0 0; }',
            '.card-header { background: var(--ezul-bg); padding: 12px 16px; font-size: 16px; font-weight: 700; color: var(--ezul-header-fg); letter-spacing: 0.5px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--ezul-border); }',
            '.card-badge { color: var(--ezul-primary); font-size: 13px; font-weight: 600; }',
            '.card-body { padding: 0; }',
            '.section { position: relative; }',
            '.section-bar { display: flex; height: 46px; align-items: center; cursor: pointer; background: var(--ezul-bg); border-bottom: 1px solid var(--ezul-border); transition: background 0.2s ease; }',
            '.section:last-child .section-bar { border-bottom: none; }',
            '.section:hover .section-bar { background: var(--ezul-link-hover-bg); }',
            '.sec-label { flex: 0 0 auto; width: 36px; color: var(--ezul-text-secondary); font-size: 13px; font-weight: 600; padding-left: 14px; }',
            '.sec-text { flex: 1; padding-left: 8px; font-size: 15px; font-weight: 600; color: var(--ezul-text); letter-spacing: 0.3px; }',
            '.sec-arrow { padding-right: 16px; font-size: 18px; font-weight: 400; color: var(--ezul-border-strong); transition: transform 0.25s ease; }',
            '.section.open .sec-arrow, .section.pinned .sec-arrow { transform: rotate(90deg); }',
            '.section.open .section-bar, .section.pinned .section-bar { background: var(--ezul-link-hover-bg); border-left: 4px solid var(--ezul-primary); }',
            '.section.open .sec-label, .section.pinned .sec-label { color: var(--ezul-primary); }',
            '.section.open .sec-text, .section.pinned .sec-text { color: var(--ezul-primary); }',
            '.section-body { display: none; padding: 6px 14px 14px; }',
            '.section.open .section-body, .section.pinned .section-body { display: block; animation: ezul-expand 0.18s ease; }',
            '.section:last-child .section-body { padding-bottom: 0; }',
            '@keyframes ezul-expand { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }',
            '.theme-switch { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--ezul-border); }',
            '.theme-label { font-size: 13px; font-weight: 600; color: var(--ezul-text); }',
            '.theme-opts { display: flex; }',
            '.theme-opts input { display: none; }',
            '.theme-opts label { cursor: pointer; padding: 3px 12px; font-size: 12px; font-weight: 400; color: var(--ezul-text-secondary); border: 1px solid var(--ezul-border); margin-left: 6px; background: var(--ezul-bg); border-radius: 100px; transition: all 0.2s ease; }',
            '.theme-opts label:hover { border-color: var(--ezul-primary); color: var(--ezul-text); }',
            '.theme-opts input:checked + label { background: var(--ezul-primary); color: #ffffff; border-color: var(--ezul-primary); }',
            '.match-btns { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; }',
            '.match-btns button { flex: 1; min-width: 0; margin: 0; }',
            '.OptionUL { list-style: none; padding: 0; margin: 0; }',
            '.OptionUL li { display: flex; justify-content: space-between; align-items: center; margin: 0; padding: 10px 0; line-height: 1.6; color: var(--ezul-text); border-bottom: 1px dashed var(--ezul-border); }',
            '.OptionUL li:last-child { border-bottom: none; }',
            '.OptionInput[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; accent-color: var(--ezul-primary); }',
            '.OptionInput[type="number"] { width: 70px; height: 30px; padding: 4px 8px; border: 1px solid var(--ezul-border); border-radius: 4px; text-align: center; font-size: 14px; color: var(--ezul-text); background: var(--ezul-bg); font-family: inherit; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }',
            '.OptionInput[type="number"]:focus { border-color: var(--ezul-primary); box-shadow: 0 0 6px rgba(234,89,71,0.3); }',
            '.rate-slider-li { display: block !important; position: relative; padding: 14px 0 24px !important; }',
            '.rate-slider-li::before { content: "0.25"; color: var(--ezul-text-secondary); font-size: 11px; position: absolute; bottom: 6px; left: 0; }',
            '.rate-slider-li::after { content: "15"; color: var(--ezul-text-secondary); font-size: 11px; position: absolute; bottom: 6px; right: 0; }',
            '.rate-slider-li input { width: 100%; }',
            '.OptionInput[type="range"] { -webkit-appearance: none; appearance: none; height: 20px; background: transparent; cursor: pointer; margin: 0; outline: none; }',
            '.OptionInput[type="range"]::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: var(--ezul-border); }',
            '.OptionInput[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; margin-top: -5px; border-radius: 50%; background: var(--ezul-primary); border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: background 0.15s ease; }',
            '.OptionInput[type="range"]::-webkit-slider-thumb:hover { background: var(--ezul-primary-hover); }',
            '.OptionInput[type="range"]:active::-webkit-slider-thumb { background: var(--ezul-primary-active); }',
            '.OptionInput[type="range"]::-moz-range-track { height: 4px; border-radius: 2px; background: var(--ezul-border); }',
            '.OptionInput[type="range"]::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--ezul-primary); }',
            '.OptionInput[type="range"]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--ezul-primary); border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: background 0.15s ease; }',
            '.OptionInput[type="range"]::-moz-range-thumb:hover { background: var(--ezul-primary-hover); }',
            '.OptionInput[type="text"] { width: 100%; height: 36px; padding: 0 12px; border: none; border-radius: 4px; background: var(--ezul-field-bg); color: var(--ezul-text); font-size: 14px; font-family: inherit; outline: none; transition: box-shadow 0.15s ease; }',
            '.OptionInput[type="text"]:focus { box-shadow: inset 0 1px 1px rgba(0,0,0,0.075), 0 0 8px rgba(170,163,202,0.8); }',
            '.OptionInput[type="text"]::-webkit-input-placeholder { color: var(--ezul-text-secondary); }',
            'button { font-family: inherit; display: inline-block; min-width: 80px; height: 32px; line-height: 30px; font-size: 14px; padding: 0 10px; border-radius: 4px; outline: none; color: #ffffff; vertical-align: middle; background-color: var(--ezul-primary); border: 1px solid var(--ezul-primary); cursor: pointer; transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease; }',
            'button:hover { background-color: var(--ezul-primary-hover); border-color: var(--ezul-primary-hover); }',
            'button:active { background-color: var(--ezul-primary-active); border-color: var(--ezul-primary-active); }',
            'button:disabled { color: #bbb !important; background-color: #ededed !important; border-color: #ededed !important; }',
            '#MainBtn, #MatchResetBtn { min-width: 0; color: var(--ezul-ball-text); background-color: var(--ezul-ball-bg); border-color: var(--ezul-border); }',
            '#MainBtn:hover, #MatchResetBtn:hover { border-color: var(--ezul-primary); }',
            '#MainBtn:active, #MatchResetBtn:active { color: var(--ezul-primary); border-color: var(--ezul-primary); }',
            '#SaveOpBtn, #MatchSaveBtn { font-weight: 600; }',
            '.save-row { display: flex; align-items: stretch; gap: 8px; padding: 14px 16px 14px; }',
            '.save-row button { margin: 0; }',
            '#MainBtn { flex: 0 0 auto; }',
            '#SaveOpBtn { flex: 1; }',
            '.save-hint { display: none; padding: 0 16px 14px; }',
            '.save-hint .WarningText { margin: 0 0 14px; }',
            '.save-row:hover ~ .save-hint, .save-hint.show { display: block; animation: ezul-expand 0.18s ease; }',
            '.WarningText { color: var(--ezul-danger); background: var(--ezul-danger-bg); padding: 10px 14px; border-radius: 4px; border-left: 3px solid var(--ezul-danger); font-size: 12px; line-height: 1.8; }',
            '.MainPanel::-webkit-scrollbar { width: 5px; }',
            '.MainPanel::-webkit-scrollbar-track { background: var(--ezul-scrollbar-track); }',
            '.MainPanel::-webkit-scrollbar-thumb { background: var(--ezul-scrollbar-thumb); border-radius: 5px; }',
            '.MainPanel::-webkit-scrollbar-corner { background: transparent; }',
            '@media (max-width: 768px) { .OptionPanel { top: 10px; right: 10px; } .MainPanel { width: 260px; max-height: 70vh; } }'
        ].join('\n');
        document.head.appendChild(style);

        var root = document.body;
        var panel = document.createElement('div');
        root.appendChild(panel);
        panel.setAttribute('class', 'OptionPanel');

        var html = '<div class="OptionPanel">' +
            '<div class="DragBall"><img src="' + chrome.runtime.getURL('icons/icon.png') + '" alt="" style="width:30px;height:30px;pointer-events:none;"></div>' +
            '<div class="MainPanel">' +
            '<div class="card-header">优学院好舒服啊<span class="card-badge">828</span></div>' +
            '<div class="card-body">' +
            '<div class="theme-switch">' +
            '<span class="theme-label">主题</span>' +
            '<span class="theme-opts">' +
            '<input type="radio" id="ezul-theme-system" name="ezul-theme-radio" value="system"><label for="ezul-theme-system">系统</label>' +
            '<input type="radio" id="ezul-theme-light" name="ezul-theme-radio" value="light"><label for="ezul-theme-light">浅色</label>' +
            '<input type="radio" id="ezul-theme-dark" name="ezul-theme-radio" value="dark"><label for="ezul-theme-dark">深色</label>' +
            '</span>' +
            '</div>' +

            '<div class="section">' +
            '<div class="section-bar"><span class="sec-label">01</span><span class="sec-text">站点匹配</span><span class="sec-arrow">&#8250;</span></div>' +
            '<div class="section-body">' +
            '<ul class="OptionUL">' +
            '<li><input class="OptionInput" id="MatchCore" type="text" style="width:100%;text-align:left;" placeholder="如 ua.dgut.edu.cn/learnCourse/"></li>' +
            '</ul>' +
            '<div class="match-btns">' +
            '<button id="MatchSaveBtn">确认修改</button>' +
            '<button id="MatchResetBtn">恢复默认</button>' +
            '</div>' +
            '</div>' +
            '</div>' +

            '<div class="section">' +
            '<div class="section-bar"><span class="sec-label">02</span><span class="sec-text">视频播放</span><span class="sec-arrow">&#8250;</span></div>' +
            '<div class="section-body">' +
            '<ul class="OptionUL">' +
            '<li>自动翻页、播放视频?<input class="OptionInput" id="AutoPlay" type="checkbox" checked="checked"></li>' +
            '<li>自动静音?<input class="OptionInput" id="AutoMute" type="checkbox" checked="checked"></li>' +
            '<li>自动调整速率(依赖自动播放)?<input class="OptionInput" id="AutoPlayRate" type="checkbox" checked="checked"></li>' +
            '<li>播放速率<input class="OptionInput" id="AutoPlayRateChange" type="number" value="1.50" step="0.25" min="0.25" max="15.00"></li>' +
            '<li class="rate-slider-li"><input class="OptionInput" id="AutoPlayRateSlider" type="range" min="0.25" max="15.00" step="0.25" value="1.50"></li>' +
            '</ul>' +
            '</div>' +
            '</div>' +

            '<div class="section">' +
            '<div class="section-bar"><span class="sec-label">03</span><span class="sec-text">自动作答</span><span class="sec-arrow">&#8250;</span></div>' +
            '<div class="section-body">' +
            '<ul class="OptionUL">' +
            '<li>自动作答(总开关)?<input class="OptionInput" id="AutoAnswer" type="checkbox" checked="checked"></li>' +
            '<li>自动显示答案?<input class="OptionInput" id="AutoShowAnswer" type="checkbox" checked="checked"></li>' +
            '<li>自动作答选择题?<input class="OptionInput" id="AutoAnswerChoices" type="checkbox" checked="checked"></li>' +
            '<li>自动作答判断题?<input class="OptionInput" id="AutoAnswerJudges" type="checkbox" checked="checked"></li>' +
            '<li>自动作答填空、简答题?<input class="OptionInput" id="AutoAnswerFills" type="checkbox" checked="checked"></li>' +
            '</ul>' +
            '</div>' +
            '</div>' +

            '<div class="save-row">' +
            '<button id="MainBtn">隐藏</button>' +
            '<button id="SaveOpBtn">保存设置并刷新脚本</button>' +
            '</div>' +
            '<div class="save-hint">' +
            '<p class="WarningText">若<strong>关闭自动翻页功能</strong>导致<strong>自动作答系列功能失效</strong>请点击<strong>保存设置并刷新脚本按钮！</strong></p>' +
            '<p class="WarningText">若关闭自动翻页功能答完题后请<strong>手动提交！！</strong></p>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';

        panel.innerHTML = html;
    }

    // ============================================================================
    // 原生 JS 拖拽实现（替代 jQuery UI draggable）
    // ============================================================================

    function makeDraggable(element, containmentSelector) {
        var isDragging = false;
        var wasDragged = false;
        var startX, startY, startLeft, startTop;
        var containmentEl = null;

        element.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            isDragging = true;
            wasDragged = false;
            startX = e.clientX;
            startY = e.clientY;

            var computedStyle = window.getComputedStyle(element);
            startLeft = parseInt(computedStyle.left, 10) || 0;
            startTop = parseInt(computedStyle.top, 10) || 0;

            if (containmentSelector) {
                containmentEl = document.querySelector(containmentSelector);
            }

            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;

            var dx = e.clientX - startX;
            var dy = e.clientY - startY;

            if (Math.sqrt(dx * dx + dy * dy) > 3) {
                wasDragged = true;
            }

            var newLeft = startLeft + dx;
            var newTop = startTop + dy;

            if (containmentEl) {
                var containerRect = containmentEl.getBoundingClientRect();
                var elRect = element.getBoundingClientRect();

                if (newLeft < 0) newLeft = 0;
                if (newTop < 0) newTop = 0;
                if (newLeft + elRect.width > containerRect.width) {
                    newLeft = containerRect.width - elRect.width;
                }
                if (newTop + elRect.height > containerRect.height) {
                    newTop = containerRect.height - elRect.height;
                }
            }

            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', function () {
            if (!isDragging) return;
            isDragging = false;
        });

        element._wasDragged = function () { return wasDragged; };
    }

    // ============================================================================
    // UI 初始化
    // ============================================================================

    var mainBtn, dragBall, saveOpBtn, MainPanel;
    var matchCoreOp, matchSaveBtn, matchResetBtn;
    var autoPlayOp, autoMuteOp, autoPlayRateOp, autoPlayRateChangeOp, autoPlayRateSliderOp;
    var autoAnswerOp, autoShowAnswerOp, autoAnswerChoicesOp, autoAnswerJudgesOp, autoAnswerFillsOp;

    function Init() {
        mainBtn = document.getElementById('MainBtn');
        dragBall = $('.DragBall');
        saveOpBtn = document.getElementById('SaveOpBtn');
        MainPanel = $('.MainPanel');
        autoPlayOp = document.getElementById('AutoPlay');
        autoMuteOp = document.getElementById('AutoMute');
        autoPlayRateOp = document.getElementById('AutoPlayRate');
        autoPlayRateChangeOp = document.getElementById('AutoPlayRateChange');
        autoPlayRateSliderOp = document.getElementById('AutoPlayRateSlider');
        autoAnswerOp = document.getElementById('AutoAnswer');
        autoShowAnswerOp = document.getElementById('AutoShowAnswer');
        autoAnswerChoicesOp = document.getElementById('AutoAnswerChoices');
        autoAnswerJudgesOp = document.getElementById('AutoAnswerJudges');
        autoAnswerFillsOp = document.getElementById('AutoAnswerFills');
        matchCoreOp = document.getElementById('MatchCore');
        matchSaveBtn = document.getElementById('MatchSaveBtn');
        matchResetBtn = document.getElementById('MatchResetBtn');

        // 主题切换
        var THEME_KEY = 'EZUL_THEME';
        var savedTheme = localStorage.getItem(THEME_KEY) || 'system';

        function applyTheme(theme) {
            var root = document.documentElement;
            root.classList.remove('ezul-theme-light', 'ezul-theme-dark');
            if (theme === 'light') root.classList.add('ezul-theme-light');
            else if (theme === 'dark') root.classList.add('ezul-theme-dark');
            localStorage.setItem(THEME_KEY, theme);

            var radios = document.querySelectorAll('input[name="ezul-theme-radio"]');
            radios.forEach(function (radio) {
                radio.checked = (radio.value === theme);
            });
        }

        applyTheme(savedTheme);

        var themeRadios = document.querySelectorAll('input[name="ezul-theme-radio"]');
        themeRadios.forEach(function (radio) {
            radio.addEventListener('change', function () {
                if (this.checked) applyTheme(this.value);
            });
        });

        // 原生拖拽
        var dragBallEl = dragBall[0];
        if (dragBallEl) {
            makeDraggable(dragBallEl, '.page-scroller');
        }

        dragBall.hide();

        mainBtn.addEventListener('click', function () {
            MainPanel.hide();
            dragBall.show();
        }, true);

        dragBall.click(function () {
            if (dragBallEl._wasDragged && dragBallEl._wasDragged()) {
                return;
            }
            MainPanel.show();
            dragBall.hide();
        });

        // 01/02 板块：悬停展开，离开即收起
        $('.section').slice(0, 2)
            .on('mouseenter', function () {
                $(this).addClass('open');
            })
            .on('mouseleave', function () {
                $(this).removeClass('open');
            });

        // 03 自动作答板块：悬停固定展开，离开整个面板或打开其他分区才折叠
        var answerSection = $('.section').eq(2);
        var otherSections = $('.section').not(answerSection);
        var mainPanelEl = MainPanel[0];
        if (mainPanelEl && answerSection.length > 0) {
            mainPanelEl.addEventListener('mouseleave', function () {
                answerSection.removeClass('pinned');
            });
            otherSections.on('mouseenter', function () {
                answerSection.removeClass('pinned');
            });
            answerSection.on('mouseenter', function () {
                answerSection.addClass('pinned');
            });
        }

        // 悬停 保存/隐藏 按钮行时展开下方提示区（面板级事件委托，稳定可靠）
        var saveHintEl = $('.save-hint');
        var saveRowUiPanel = $('.MainPanel')[0];
        if (saveRowUiPanel && saveHintEl.length > 0) {
            function saveZoneOf(node) {
                if (!node || !node.closest) return null;
                return node.closest('.save-row, .save-hint, #MainBtn, #SaveOpBtn');
            }
            saveRowUiPanel.addEventListener('mouseover', function (e) {
                if (saveZoneOf(e.target)) {
                    saveHintEl.addClass('show');
                }
            });
            saveRowUiPanel.addEventListener('mouseout', function (e) {
                var next = e.relatedTarget;
                if (saveZoneOf(e.target) && !saveZoneOf(next)) {
                    saveHintEl.removeClass('show');
                }
            });
        }

        autoPlayRateChangeOp.addEventListener('change', function () {
            var val = parseFloat(autoPlayRateChangeOp.value);
            if (val > 15.0) autoPlayRateChangeOp.value = 15;
            else if (val < 0.25) autoPlayRateChangeOp.value = 0.25;
        }, true);

        autoPlayRateChangeOp.addEventListener('input', function () {
            var val = parseFloat(autoPlayRateChangeOp.value);
            if (isNaN(val)) return;
            val = Math.min(15, Math.max(0.25, val));
            autoPlayRateSliderOp.value = val;
        }, true);

        autoPlayRateSliderOp.addEventListener('input', function () {
            autoPlayRateChangeOp.value = parseFloat(autoPlayRateSliderOp.value).toFixed(2);
        }, true);

        autoPlayOp.addEventListener('change', function () {
            if (autoPlayOp.checked === false)
                autoMuteOp.checked = autoPlayRateOp.checked = false;
            else
                autoMuteOp.checked = autoPlayRateOp.checked = true;
        });

        autoAnswerOp.addEventListener('change', function () {
            if (autoAnswerOp.checked === false)
                autoAnswerChoicesOp.checked = autoAnswerJudgesOp.checked = autoAnswerFillsOp.checked = autoShowAnswerOp.checked = false;
            else
                autoAnswerChoicesOp.checked = autoAnswerJudgesOp.checked = autoAnswerFillsOp.checked = autoShowAnswerOp.checked = true;
        });

        saveOpBtn.addEventListener('click', function () {
            console.log('[配置管理器] 保存配置...');

            ENABLE_AUTO_MUTE = autoMuteOp.checked;
            ENABLE_AUTO_CHANGE_RATE = autoPlayRateOp.checked;
            ENABLE_AUTO_PLAY = autoPlayOp.checked;
            ENABLE_AUTO_SHOW_ANSWER = autoShowAnswerOp.checked;
            ENABLE_AUTO_ANSWER_CHOICES = autoAnswerChoicesOp.checked;
            ENABLE_AUTO_ANSWER_JUDGES = autoAnswerJudgesOp.checked;
            ENABLE_AUTO_ANSWER_FILLS = autoAnswerFillsOp.checked;

            if (!ENABLE_AUTO_SHOW_ANSWER && !ENABLE_AUTO_ANSWER_CHOICES && !ENABLE_AUTO_ANSWER_JUDGES && !ENABLE_AUTO_ANSWER_FILLS) {
                autoAnswerOp.checked = false;
            }
            ENABLE_AUTO_FILL_ANSWER = autoAnswerOp.checked;
            PLAYBACK_RATE = parseFloat(autoPlayRateChangeOp.value);

            var newConfig = {
                enableAutoMute: ENABLE_AUTO_MUTE,
                enableAutoChangeRate: ENABLE_AUTO_CHANGE_RATE,
                enableAutoPlay: ENABLE_AUTO_PLAY,
                enableAutoShowAnswer: ENABLE_AUTO_SHOW_ANSWER,
                enableAutoAnswerChoices: ENABLE_AUTO_ANSWER_CHOICES,
                enableAutoAnswerJudges: ENABLE_AUTO_ANSWER_JUDGES,
                enableAutoAnswerFills: ENABLE_AUTO_ANSWER_FILLS,
                enableAutoFillAnswer: ENABLE_AUTO_FILL_ANSWER,
                playbackRate: PLAYBACK_RATE
            };

            config.setAll(newConfig);
            config.saveToStorage();

            console.log('[配置管理器] 配置已保存:', newConfig);

            Video({}, true);
            CheckModal(true);
        }, true);

        // 从配置加载到 UI
        console.log('[配置管理器] 加载配置到UI...');
        var currentConfig = config.getAll();

        autoMuteOp.checked = ENABLE_AUTO_MUTE = currentConfig.enableAutoMute;
        autoPlayRateOp.checked = ENABLE_AUTO_CHANGE_RATE = currentConfig.enableAutoChangeRate;
        autoPlayOp.checked = ENABLE_AUTO_PLAY = currentConfig.enableAutoPlay;
        autoShowAnswerOp.checked = ENABLE_AUTO_SHOW_ANSWER = currentConfig.enableAutoShowAnswer;
        autoAnswerChoicesOp.checked = ENABLE_AUTO_ANSWER_CHOICES = currentConfig.enableAutoAnswerChoices;
        autoAnswerJudgesOp.checked = ENABLE_AUTO_ANSWER_JUDGES = currentConfig.enableAutoAnswerJudges;
        autoAnswerFillsOp.checked = ENABLE_AUTO_ANSWER_FILLS = currentConfig.enableAutoAnswerFills;
        autoAnswerOp.checked = ENABLE_AUTO_FILL_ANSWER = currentConfig.enableAutoFillAnswer;
        autoPlayRateChangeOp.value = PLAYBACK_RATE = currentConfig.playbackRate;
        autoPlayRateSliderOp.value = PLAYBACK_RATE;

        console.log('[配置管理器] 配置已加载到UI');

        // ============================================================================
        // 站点匹配模块（修改 "*" 之间的内容，确认后立即生效）
        // ============================================================================

        function extractMatchCore(pattern) {
            return String(pattern || '').trim()
                .replace(/^[a-z][a-z0-9+.-]*:\/\/\*?\.?/i, '')
                .replace(/\*+$/g, '');
        }

        function buildMatchPattern(core) {
            core = String(core || '').trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\*+$/g, '');
            if (!core) return '';
            return '*://' + core.replace(/\*{2,}/g, '*') + '*';
        }

        chrome.storage.local.get('EZUL_MATCH_PATTERNS', function (data) {
            var list = data['EZUL_MATCH_PATTERNS'];
            if (Array.isArray(list) && list.length > 0) {
                matchCoreOp.value = extractMatchCore(list[0]);
            }
        });

        matchSaveBtn.addEventListener('click', function () {
            var pattern = buildMatchPattern(matchCoreOp.value);
            if (!pattern) return;
            chrome.runtime.sendMessage({ type: 'updateMatches', core: pattern }, function (resp) {
                if (chrome.runtime.lastError || !resp || !resp.ok) return;
                matchCoreOp.value = extractMatchCore(pattern);
                var hostPart = extractMatchCore(pattern).split('/')[0].replace(/^\*\./, '').toLowerCase();
                var hostname = location.hostname.toLowerCase();
                if (hostPart && (hostname === hostPart || hostname.endsWith('.' + hostPart))) {
                    setTimeout(function () { location.reload(); }, 800);
                }
            });
        });

        matchResetBtn.addEventListener('click', function () {
            chrome.runtime.sendMessage({ type: 'updateMatches', core: '' }, function () {
                matchCoreOp.value = '';
            });
        });
    }

    // ============================================================================
    // 主入口
    // ============================================================================

    function Main() {
        try {
            DrawOptionPanel();
            Init();
            Video();
            CheckModal();
        } catch (error) {
            console.error('优学院脚本初始化失败:', error);
            try {
                Video();
                CheckModal();
            } catch (e) {
                console.error('脚本恢复失败:', e);
            }
        }
    }

    // 保持页面活跃（模拟用户活动以避免后台挂起）
    setInterval(function () {
        window.document.dispatchEvent(new Event('mousemove'));
    }, 1000);

    // 延迟启动，等待页面加载
    setTimeout(Main, 3000);

})();
