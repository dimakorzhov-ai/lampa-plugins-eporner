(function () {
    'use strict';

    var PLUGIN_NAME = 'eporner_catalog';
    var MENU_CLASS = 'eporner-menu-item';
    var STYLE_ID = 'eporner-plugin-styles';

    function EpornerComponent(object) {
        var comp = this;
        object = object || {};

        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });

        var destroyed = false;
        var loading = false;
        var currentPage = 1;
        var totalPages = Infinity;
        var currentQuery = String(object.search || '').trim();
        var currentCategory = String(object.category || '');
        var requests = [];
        var seenIds = Object.create(null);

        var categories = [
            { title: 'Все', id: '' },
            { title: 'Japanese', id: 'japanese' },
            { title: 'Amateur', id: 'amateur' },
            { title: 'MILF', id: 'milf' },
            { title: 'Big Tits', id: 'big-tits' },
            { title: 'Anal', id: 'anal' },
            { title: 'POV', id: 'pov' },
            { title: 'Teen', id: 'teen' }
        ];

        var html = $('<div class="eporner-page">' +
            '<div class="eporner-controls">' +
                '<div class="selector eporner-btn-search" tabindex="0">' +
                    '🔍 Поиск' +
                '</div>' +
                '<div class="selector eporner-btn-cat" tabindex="0">' +
                    '📂 Категория: ' +
                    '<span class="eporner-current-cat">Все</span>' +
                '</div>' +
            '</div>' +
            '<div class="eporner-cards-list"></div>' +
            '<div class="eporner-empty">Загрузка каталога…</div>' +
        '</div>');

        function installStyles() {
            if (document.getElementById(STYLE_ID)) return;

            var css = '' +
                '.eporner-page{' +
                    'width:100%;' +
                    'box-sizing:border-box;' +
                    'padding-bottom:2em;' +
                '}' +

                '.eporner-controls{' +
                    'display:flex;' +
                    'flex-wrap:wrap;' +
                    'gap:.8em;' +
                    'align-items:center;' +
                    'padding:1em 2em;' +
                    'margin-bottom:.5em;' +
                    'box-sizing:border-box;' +
                '}' +

                '.eporner-btn-search,' +
                '.eporner-btn-cat{' +
                    'background:rgba(255,255,255,.12);' +
                    'padding:.8em 1.1em;' +
                    'border-radius:8px;' +
                    'cursor:pointer;' +
                    'min-height:2.8em;' +
                    'display:flex;' +
                    'align-items:center;' +
                    'box-sizing:border-box;' +
                '}' +

                '.eporner-btn-search.focus,' +
                '.eporner-btn-cat.focus,' +
                '.eporner-btn-search:focus,' +
                '.eporner-btn-cat:focus{' +
                    'outline:2px solid currentColor;' +
                    'background:rgba(255,255,255,.22);' +
                '}' +

                '.eporner-cards-list{' +
                    'display:grid;' +
                    'grid-template-columns:repeat(auto-fill,minmax(180px,1fr));' +
                    'gap:15px;' +
                    'padding:0 2em 2em;' +
                    'box-sizing:border-box;' +
                '}' +

                '.eporner-empty{' +
                    'text-align:center;' +
                    'padding:3em 1.5em;' +
                    'opacity:.8;' +
                '}' +

                '.eporner-cards-list .card{' +
                    'min-width:0;' +
                '}' +

                '@media(max-width:600px){' +
                    '.eporner-controls{' +
                        'padding:1em;' +
                        'gap:.6em;' +
                    '}' +

                    '.eporner-btn-search,' +
                    '.eporner-btn-cat{' +
                        'padding:.7em .9em;' +
                        'font-size:1em;' +
                    '}' +

                    '.eporner-cards-list{' +
                        'grid-template-columns:repeat(2,minmax(0,1fr));' +
                        'gap:10px;' +
                        'padding:0 1em 1.5em;' +
                    '}' +
                '}' +

                '@media(min-width:601px) and (max-width:900px){' +
                    '.eporner-cards-list{' +
                        'grid-template-columns:repeat(3,minmax(0,1fr));' +
                        'gap:12px;' +
                        'padding-left:1.5em;' +
                        'padding-right:1.5em;' +
                    '}' +
                '}';

            $('<style id="' + STYLE_ID + '"></style>')
                .text(css)
                .appendTo('head');
        }

        function categoryTitle(id) {
            var found = categories.find(function (cat) {
                return cat.id === id;
            });

            return found ? found.title : 'Все';
        }

        function setMessage(message, show) {
            html.find('.eporner-empty')
                .text(message)
                .toggle(!!show);

            try {
                if (scroll && scroll.update) scroll.update();
            } catch (e) {}
        }

        function makeSearchQuery() {
            var parts = [];

            if (currentQuery) {
                parts.push(currentQuery);
            }

            if (currentCategory) {
                parts.push(currentCategory.replace(/-/g, ' '));
            }

            return parts.join(' ').trim() || 'all';
        }

        function trackRequest(xhr) {
            requests.push(xhr);
            return xhr;
        }

        function loadData(page) {
            if (destroyed || loading || page > totalPages) {
                return;
            }

            loading = true;

            if (page === 1) {
                currentPage = 1;
                totalPages = Infinity;
                seenIds = Object.create(null);

                html.find('.eporner-cards-list').empty();
                setMessage('Загрузка каталога…', true);
            } else {
                setMessage('Загрузка следующих видео…', true);
            }

            var params = {
                query: makeSearchQuery(),
                per_page: 28,
                page: page,
                format: 'json'
            };

            var queryString = Object.keys(params).map(function (key) {
                return encodeURIComponent(key) + '=' +
                    encodeURIComponent(params[key]);
            }).join('&');

            var xhr = trackRequest($.ajax({
                url: 'https://www.eporner.com/api/v2/video/search/?' +
                    queryString,
                method: 'GET',
                dataType: 'json',
                timeout: 20000
            }));

            xhr.done(function (data) {
                if (destroyed) return;

                var videos = data && Array.isArray(data.videos)
                    ? data.videos
                    : [];

                currentPage = page;

                var pages = Number(
                    data && (data.total_pages || data.totalPages)
                );

                if (isFinite(pages) && pages > 0) {
                    totalPages = pages;
                } else if (videos.length < params.per_page) {
                    totalPages = page;
                }

                if (videos.length) {
                    renderCards(videos);
                    setMessage('', false);
                } else if (page === 1) {
                    setMessage(
                        'Видео по вашему запросу не найдены.',
                        true
                    );
                } else {
                    setMessage('Больше видео нет.', true);
                }
            }).fail(function (_xhr, status) {
                if (destroyed || status === 'abort') return;

                setMessage(
                    'Не удалось загрузить каталог. ' +
                    'Проверь подключение и попробуй ещё раз.',
                    true
                );

                if (page > 1) {
                    currentPage = page - 1;
                }
            }).always(function () {
                loading = false;

                if (
                    !destroyed &&
                    comp.activity &&
                    comp.activity.loader
                ) {
                    comp.activity.loader(false);
                }
            });
        }

        function renderCards(videos) {
            var container = html.find('.eporner-cards-list');

            videos.forEach(function (item) {
                if (!item || item.id == null) return;

                var id = String(item.id);

                if (seenIds[id]) return;
                seenIds[id] = true;

                var seconds = Number(item.length_sec || 0);
                var duration = seconds > 0
                    ? Math.floor(seconds / 60) + ' мин'
                    : '';

                var card = Lampa.Template.get('card', {
                    title: item.title || 'Без названия',
                    release_year: duration
                });

                if (!card || !card.length) return;

                card.addClass('selector eporner-video-card');

                var thumb = item.default_thumb;
                var thumbUrl = typeof thumb === 'string'
                    ? thumb
                    : (thumb && thumb.src ? thumb.src : '');

                if (thumbUrl) {
                    card.find('.card__img').attr('src', thumbUrl);
                } else {
                    card.find('.card__img').removeAttr('src');
                }

                if (
                    item.hd &&
                    card.find('.card__view').length
                ) {
                    card.find('.card__view').append(
                        '<div class="card__quality">HD</div>'
                    );
                }

                card.on('hover:enter click', function (event) {
                    if (event) event.stopPropagation();
                    openVideo(item);
                });

                card.on('hover:focus', function () {
                    try {
                        if (scroll && scroll.update) scroll.update($(this));
                    } catch (e) {}

                    var index = container.children().index(card);
                    var count = container.children().length;

                    if (
                        index >= count - 8 &&
                        !loading &&
                        currentPage < totalPages
                    ) {
                        loadData(currentPage + 1);
                    }
                });

                container.append(card);
            });

            try {
                if (scroll && scroll.update) scroll.update();
            } catch (e) {}

            if (Lampa.Controller && Lampa.Controller.enable) {
                Lampa.Controller.enable('content');
            }
        }

        function getStreamUrl(sources) {
            if (!sources) return '';

            var preferred = [
                '1080p',
                '720p',
                '480p',
                '360p'
            ];

            if (Array.isArray(sources)) {
                sources.sort(function (a, b) {
                    return (
                        parseInt(b.quality, 10) || 0
                    ) - (
                        parseInt(a.quality, 10) || 0
                    );
                });

                return sources.length
                    ? (sources[0].src || sources[0].url || '')
                    : '';
            }

            for (var i = 0; i < preferred.length; i++) {
                var source = sources[preferred[i]];

                if (source && (source.src || source.url)) {
                    return source.src || source.url;
                }
            }

            var keys = Object.keys(sources);

            for (var k = 0; k < keys.length; k++) {
                var candidate = sources[keys[k]];

                if (
                    typeof candidate === 'string' &&
                    /^https?:\/\//i.test(candidate)
                ) {
                    return candidate;
                }

                if (candidate && (candidate.src || candidate.url)) {
                    return candidate.src || candidate.url;
                }
            }

            return '';
        }

        function openVideo(item) {
            if (destroyed) return;

            if (comp.activity && comp.activity.loader) {
                comp.activity.loader(true);
            }

            var xhr = trackRequest($.ajax({
                url: 'https://www.eporner.com/api/v2/video/id/?id=' +
                    encodeURIComponent(item.id) +
                    '&format=json',
                method: 'GET',
                dataType: 'json',
                timeout: 20000
            }));

            xhr.done(function (details) {
                if (destroyed) return;

                var streamUrl = getStreamUrl(
                    details && details.sources
                );

                if (!streamUrl) {
                    Lampa.Noty.show(
                        'Не удалось получить прямую ссылку на видео.'
                    );
                    return;
                }

                Lampa.Player.play({
                    url: streamUrl,
                    title: item.title || 'Eporner'
                });
            }).fail(function (_xhr, status) {
                if (!destroyed && status !== 'abort') {
                    Lampa.Noty.show(
                        'Ошибка получения ссылки на видео.'
                    );
                }
            }).always(function () {
                if (
                    !destroyed &&
                    comp.activity &&
                    comp.activity.loader
                ) {
                    comp.activity.loader(false);
                }
            });
        }

        this.create = function () {
            installStyles();
            scroll.body(html);

            html.find('.eporner-current-cat')
                .text(categoryTitle(currentCategory));

            html.find('.eporner-btn-search')
                .on('hover:enter click', function (e) {
                    if (e) e.stopPropagation();
                    Lampa.Input.edit({
                        title: 'Поиск видео',
                        value: currentQuery,
                        free: true,
                        nosave: true
                    }, function (value) {
                        if (value === undefined || destroyed) return;

                        Lampa.Activity.push({
                            url: '',
                            title: value
                                ? 'Поиск: ' + value
                                : 'Eporner',
                            component: PLUGIN_NAME,
                            search: String(value).trim(),
                            category: currentCategory,
                            page: 1
                        });
                    });
                })
                .on('hover:focus', function () {
                    try {
                        if (scroll && scroll.update) scroll.update($(this));
                    } catch (e) {}
                });

            html.find('.eporner-btn-cat')
                .on('hover:enter click', function (e) {
                    if (e) e.stopPropagation();
                    var items = categories.map(function (cat) {
                        return {
                            title: cat.title,
                            id: cat.id,
                            selected: cat.id === currentCategory
                        };
                    });

                    Lampa.Select.show({
                        title: 'Выберите категорию',
                        items: items,

                        onSelect: function (selected) {
                            if (!selected || destroyed) return;

                            Lampa.Activity.push({
                                url: '',
                                title: 'Eporner — ' + selected.title,
                                component: PLUGIN_NAME,
                                search: currentQuery,
                                category: selected.id,
                                page: 1
                            });
                        }
                    });
                })
                .on('hover:focus', function () {
                    try {
                        if (scroll && scroll.update) scroll.update($(this));
                    } catch (e) {}
                });

            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(html.find('.selector'));
                },
                left: function () {
                    Lampa.Controller.toggle('menu');
                },
                right: function () {},
                up: function () {
                    Lampa.Controller.toggle('head');
                },
                down: function () {
                    var next = Lampa.Controller.collectionFocus();
                    if (!next) {
                        Lampa.Controller.collectionFocus(html.find('.eporner-cards-list .card').eq(0));
                    }
                }
            });
        };

        this.start = function () {
            Lampa.Controller.toggle('content');
            loadData(1);
        };

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            destroyed = true;

            requests.forEach(function (xhr) {
                if (
                    xhr &&
                    xhr.readyState !== 4 &&
                    xhr.abort
                ) {
                    xhr.abort();
                }
            });

            requests = [];
            html.find('*').off();
            scroll.destroy();
        };
    }

    function registerPlugin() {
        if (
            window.plugin_eporner_ready ||
            !window.Lampa ||
            !Lampa.Component
        ) {
            return;
        }

        window.plugin_eporner_ready = true;

        Lampa.Component.add(PLUGIN_NAME, EpornerComponent);

        var menuTimer = null;
        var menuAttempts = 0;

        function addMenu() {
            var menuList = $('.menu .menu__list');

            if (menuList.length) {
                if (!menuList.find('.' + MENU_CLASS).length) {
                    var menuItem = $(
                        '<li class="menu__item ' +
                        MENU_CLASS +
                        ' selector">' +
                            '<div class="menu__ico">' +
                                '<svg viewBox="0 0 24 24" ' +
                                'width="24" height="24" ' +
                                'aria-hidden="true">' +
                                    '<path fill="currentColor" ' +
                                    'd="M21 3H3c-1.1 0-2 .9-2 2v14' +
                                    'c0 1.1.9 2 2 2h18c1.1 0 2-.9' +
                                    ' 2-2V5c0-1.1-.9-2-2-2zm0 16' +
                                    'H3V5h18v14zM8 15l5-3-5-3v6z"/>' +
                                '</svg>' +
                            '</div>' +
                            '<div class="menu__text">Eporner</div>' +
                        '</li>'
                    );

                    menuItem.on('hover:enter click', function () {
                        Lampa.Activity.push({
                            url: '',
                            title: 'Eporner',
                            component: PLUGIN_NAME,
                            page: 1
                        });
                    });

                    menuList.append(menuItem);
                }

                if (menuTimer) {
                    clearInterval(menuTimer);
                }

                menuTimer = null;
                return;
            }

            menuAttempts++;

            if (menuAttempts > 30 && menuTimer) {
                clearInterval(menuTimer);
                menuTimer = null;
            }
        }

        addMenu();

        if (!menuTimer) {
            menuTimer = setInterval(addMenu, 500);
        }
    }

    if (window.appready) {
        registerPlugin();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function (event) {
            if (event && event.type === 'ready') {
                registerPlugin();
            }
        });
    }
})();
