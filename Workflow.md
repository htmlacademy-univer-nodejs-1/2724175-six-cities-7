# Как работать над проектом

## Запуск проекта

Требования: Node.js 18.x и npm 8 или выше согласно `package.json`.

Установка зависимостей:

```bash
npm ci
```

Запуск CLI (без аргументов выводится справка):

```bash
npm run cli
npm run cli -- --version
npm run cli -- --import mocks/offers.tsv
```

Команда `--import` выводит предложения из TSV в консоль. Генерация данных и подключение
к базе данных на текущем этапе не реализованы. Переменные окружения не требуются.

## Сценарии

| Сценарий | Назначение |
| --- | --- |
| `npm start` | Сборка проекта и запуск `dist/main.js` (пока пустая точка входа). |
| `npm run cli -- [аргументы]` | Сборка и запуск CLI. |
| `npm run build` | Очистка `dist` и компиляция TypeScript. |
| `npm run compile` | Компиляция TypeScript в `dist`. |
| `npm run clean` | Удаление `dist`. |
| `npm run lint` | Проверка TypeScript-кода в `src` с помощью ESLint. |
| `npm run ts -- <путь>` | Запуск TypeScript-модуля через ts-node. |
| `npm test` | Сборка и запуск автоматических тестов. |
