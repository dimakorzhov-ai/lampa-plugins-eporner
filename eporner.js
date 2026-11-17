(function () {
    'use strict';

    function EpornerComponent(object) {
        var comp = this;
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        
        var html = $('<div>' +
            '<div class="eporner-controls" style="padding: 1em 2em; display: flex; gap: 1em; align-items: center; margin-bottom: 1em;">' +
                '<div class="selector eporner-btn-search" style="background: rgba(255,255,255,0.15); padding: 0.6em 1.5em; border-radius: 6px; cursor: pointer;">🔍 Поиск</div>' +
                '<div class="selector eporner-btn-cat" style="background: rgba(255,255,255,0.15); padding: 0.6em 1.5em; border-radius: 6px; cursor: pointer;">📂 Категория: <span id="eporner-current-cat">Все</span></div>' +
            '</div>' +
            '<div class="eporner-cards-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; padding: 0 2em 2em 2em;"></div>' +
            '<div class="empty" style="text-align: center; padding: 3em;">Загрузка каталога Eporner...</div>' +
        '</div>');

        var wait_results = false;
        var current_page = 1;
        var current_query = object.search || '';
        var current_category = object.category || '';

        var categories_list = [
            { title: 'Все', id: '' },
            { title: 'Japanese', id: 'japanese' },
            { title: 'Amateur', id: 'amateur' },
            { title: 'MILF', id: 'milf' },
            { title: 'Big Tits', id: 'big-tits' },
            { title: 'Anal', id: 'anal' },
            { title: 'POV', id: 'pov' },
            { title: 'Teen', id: 'teen' }
        ];

        this.create = function () {
            comp.activity.loader(true);
            
            scroll.body(html);

            html.find('.eporner-btn-search').on('hover:enter click', function () {
                Lampa.Input.edit({
                    title: 'Поиск видео в Eporner',
                    value: current_query,
                    free: true,
                    nosave: true
                }, function (new_value) {
                    if (new_value !== undefined) {
                        Lampa.Activity.push({
                            url: '',
                            title: 'Поиск: ' + new_value,
                            component: 'eporner_catalog',
                            search: new_value,
                            category: current_category,
                            page: 1
                        });
                    }
                });
            });

            html.find('.eporner-btn-cat').on('hover:enter click', function () {
                var items = categories_list.map(function (cat) {
                    return {
                        title: cat.title,
                        selected: cat.id === current_category
                    };
                });

                Lampa.Select.show({
                    title: 'Выберите категорию',
                    items: items,
                    onSelect: function (a) {
                        Lampa.Activity.push({
                            url: '',
                            title: 'Eporner - ' + a.title,
                            component: 'eporner_catalog',
                            search: current_query,
                            category: a.id,
                            page: 1
                        });
                    }
                });
            });

            if (current_category) {
                var found = categories_list.find(c => c.id === current_category);
                if (found) html.find('#eporner-current-cat').text(found.title);
            }

            loadData(1);
        };

        function loadData(page) {
            wait_results = true;
            var url = 'https://www.eporner.com/api/v2/video/search/?per_page=28&page=' + page + '&format=json';
            if (current_query) {
                url += '&query=' + encodeURIComponent(current_query);
            }
            if (current_category) {
                url += '&query=' + encodeURIComponent(current_category);
            }

            $.ajax({
                url: url,
                method: 'GET',
                dataType: 'json',
                success: function (data) {
                    comp.activity.loader(false);
                    wait_results = false;
                    html.find('.empty').hide();
                    if (data && data.videos && data.videos.length > 0) {
                        renderCards(data.videos);
                    } else if (page === 1) {
                        html.find('.empty').text('Видео по вашему запросу не найдены').show();
                    }
                },
                error: function () {
                    comp.activity.loader(false);
                    wait_results = false;
                    html.find('.empty').text('Ошибка загрузки данных с Eporner').show();
                }
            });
        }

        function renderCards(videos) {
            var items_container = html.find('.eporner-cards-list');

            videos.forEach(function (item) {
                var duration_min = Math.floor(item.length_sec / 60);
                var card = Lampa.Template.get('card', {
                    title: item.title,
                    release_year: duration_min + ' мин'
                });

                card.addClass('selector');
                card.find('.card__img').attr('src', item.default_thumb.src);
                
                if (item.hd) {
                    card.find('.card__view').append('<div class="card__quality">HD</div>');
                }

                card.on('hover:enter click', function () {
                    openVideo(item);
                });

                card.on('hover:focus', function () {
                    var next_row = card.index();
                    if (next_row >= items_container.children().length - 8 && !wait_results) {
                        current_page++;
                        loadData(current_page);
                    }
                });

                items_container.append(card);
            });

            Lampa.Controller.enable('content');
        }

        function openVideo(item) {
            comp.activity.loader(true);
            $.ajax({
                url: 'https://www.eporner.com/api/v2/video/id/?id=' + item.id + '&format=json',
                method: 'GET',
                dataType: 'json',
                success: function (details) {
                    comp.activity.loader(false);
                    if (details && details.sources) {
                        var stream_url = '';
                        if (details.sources['1080p'] && details.sources['1080p'].src) {
                            stream_url = details.sources['1080p'].src;
                        } else if (details.sources['720p'] && details.sources['720p'].src) {
                            stream_url = details.sources['720p'].src;
                        } else if (details.sources['480p'] && details.sources['480p'].src) {
                            stream_url = details.sources['480p'].src;
                        } else {
                            var keys = Object.keys(details.sources);
                            if (keys.length > 0) stream_url = details.sources[keys[0]].src;
                        }

                        if (stream_url) {
                            Lampa.Player.play({
                                url: stream_url,
                                title: item.title
                            });
                            Lampa.Player.playlist([item.title, stream_url]);
                        } else {
                            Lampa.Noty.show('Не удалось найти прямую ссылку');
                        }
                    }
                },
                error: function () {
                    comp.activity.loader(false);
                    Lampa.Noty.show('Ошибка получения ссылки');
                }
            });
        }

        this.render = function () {
            return scroll.render();
        };

        this.destroy = function () {
            scroll.destroy();
        };
    }

    function registerPlugin() {
        if (window.plugin_eporner_ready) return;
        window.plugin_eporner_ready = true;

        Lampa.Component.add('eporner_catalog', EpornerComponent);

        function addMenu() {
            if ($('.menu .menu__list').length && $('.menu .menu__list').find('.eporner-menu-item').length === 0) {
                var menu_item = $(`
                    <li class="menu__item eporner-menu-item selector">
                        <div class="menu__ico">
                            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15l5-3-5-3v6z"/></svg>
                        </div>
                        <div class="menu__text">Eporner</div>
                    </li>
                `);
                
                menu_item.on('hover:enter click', function () {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Eporner',
                        component: 'eporner_catalog',
                        page: 1
                    });
                });

                $('.menu .menu__list').append(menu_item);
            }
        }

        setInterval(addMenu, 1000);
    }

    if (window.appready) {
        registerPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                registerPlugin();
            }
        });
    }

})();
