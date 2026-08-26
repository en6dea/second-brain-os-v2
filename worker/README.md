# Сервер «Второго мозга»

Cloudflare Worker выполняет две независимые задачи:

- прячет ключ Anthropic от статического сайта;
- принимает команды личного Telegram-бота и временно держит недоставленные
  задачи/заметки в D1.

Токены и тексты сообщений не входят в репозиторий. После успешного импорта
приложение подтверждает доставку, и строка удаляется из D1.

## Проверка кода

```bash
npm install
npm run check
```

Команда запускает TypeScript, тест разбора Telegram-команд и сухую сборку
Wrangler.

## Первый выпуск

1. В Telegram откройте `@BotFather`, выполните `/newbot`, сохраните токен и
   имя бота без `@`.
2. Из папки `worker/` войдите в Cloudflare:

```bash
npx wrangler login
```

3. Создайте D1 в ближайшем регионе. Wrangler сам добавит выданный
   `database_id` в `wrangler.toml`:

```bash
npx wrangler d1 create second-brain-telegram --location eeur --binding TELEGRAM_DB --update-config
npx wrangler d1 migrations apply second-brain-telegram --remote
```

4. Задайте секреты интерактивно. Значения не печатайте в командной строке и
   не сохраняйте в файлах репозитория:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put TELEGRAM_BOT_USERNAME
```

`TELEGRAM_WEBHOOK_SECRET` — случайная строка из латинских букв, цифр, `_` и
`-`. Для функции помощника отдельно нужны `ANTHROPIC_API_KEY` и `ОБЩИЙ_ТОКЕН`.

5. Опубликуйте Worker:

```bash
npx wrangler deploy
```

6. Возьмите выданный адрес вида
   `https://second-brain-assistant.<поддомен>.workers.dev` и зарегистрируйте
   webhook, подставив токен бота и тот же webhook-секрет:

```text
https://api.telegram.org/bot<ТОКЕН>/setWebhook
```

Тело POST-запроса:

```json
{
  "url": "https://second-brain-assistant.<поддомен>.workers.dev/telegram/webhook",
  "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
  "allowed_updates": ["message"],
  "drop_pending_updates": true
}
```

7. В приложении откройте Настройки → «Telegram-входящие», вставьте адрес
   Worker и отправьте боту показанную команду `/link КОД`.

## Команды бота

```text
/task Позвонить клиенту
/note Идея для проекта
/unlink
```

Свободный текст намеренно не превращается в запись: приложение ничего не
угадывает. Повтор Telegram-update не создаёт дубль, а повторная доставка в
браузер распознаётся по `telegramCaptureId`.

## Изменение ключей

Секреты заменяются той же командой `wrangler secret put`. После смены
`TELEGRAM_WEBHOOK_SECRET` нужно повторно вызвать `setWebhook` с новым
значением.
