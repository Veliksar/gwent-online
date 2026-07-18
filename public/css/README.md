# CSS-модули Gwent

Точка входа: `public/style.css` - подключает все файлы через `@import` в фиксированном порядке (важен для каскада).

Пути к картинкам в модулях: `../img/...` (относительно `public/css/`).

## Файлы

| Файл | Назначение | Ключевые селекторы |
|------|------------|-------------------|
| `base.css` | Reset, типографика, доска, скроллбары | `html`, `body`, `main`, `#click-background`, `#hand-op` |
| `media.css` | Фоновая музыка | `#youtube`, `#toggle-music`, `.music-customization` |
| `notifications.css` | Полоска уведомлений в матче | `#notification-bar`, `#notif-*` |
| `card-preview.css` | Превью карты при наведении | `.card-preview`, `.card-lg`, `.card-description` |
| `carousel.css` | Карусель выбора карты (способности) | `#carousel` |
| `popup.css` | Модальное окно да/нет | `#popup` |
| `end-screen.css` | Экран окончания игры | `#end-screen`, `.end-win`, `.end-lose`, `.end-draw` |
| `panels-layout.css` | Разметка трёх колонок | `.panel`, `#panel-left`, `#panel-mid`, `#panel-right` |
| `panel-left.css` | Левая колонка: игроки, лидеры, pass | `#stats-op/me`, `.leader-box`, `.gem`, `#pass-button`, `#weather` |
| `panel-mid.css` | Центр: поле и рука | `.field`, `.field-row`, `#hand-row`, `.frost`, `.rain`, `.fog` |
| `panel-right.css` | Правая колонка: колоды и сброс | `.cardpile`, `#deck-*`, `#grave-*`, `.deck-card` |
| `deck-customization.css` | Экран сборки колоды | `#deck-customization`, `#card-bank`, `#card-deck`, `#deck-stats` |
| `cards.css` | Общие стили игровой карты | `.card`, `.card-container`, `.hero` |
| `utilities.css` | Вспомогательные классы | `.center`, `.hide`, `.visible`, `.fade`, `.noclick`, `.bg-contain` |

## Куда править

- **Глобальный вид** (фон, шрифт, курсор) -> `base.css`
- **UI матча** (поле, stats, уведомления) -> `panel-*.css`, `notifications.css`
- **Оверлеи** (popup, carousel, end screen, deck editor) -> одноимённые файлы
- **Карта как элемент** -> `cards.css`; **крупное превью** -> `card-preview.css`

## Подключение

В `index.html` один тег:

```html
<link rel="stylesheet" type="text/css" href="style.css" />
```

Новые модули добавлять в конец `style.css`, если они не должны переопределять существующие правила.
