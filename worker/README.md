# Прокси помощника

Прячет ключ Anthropic от браузера. Приложение — статический сайт на GitHub
Pages, поэтому обращаться к Anthropic напрямую из браузера означало бы
показать ключ каждому. Здесь ключ лежит секретом воркера на стороне
Cloudflare и в код никогда не попадает.

Бесплатно: тариф Cloudflare Workers Free даёт 100 000 запросов в сутки без
оплаты. При одном плане дня в сутки и нескольких сообщениях в чате это
на порядки больше, чем понадобится.

## Разворачивание

Из папки `worker/`:

```bash
npm install
npx wrangler login          # откроет браузер — войти или создать аккаунт Cloudflare
npx wrangler secret put ANTHROPIC_API_KEY    # вставить ключ с console.anthropic.com
npx wrangler secret put ОБЩИЙ_ТОКЕН          # придумать длинную случайную строку
npx wrangler deploy
```

Последняя команда выведет адрес вида
`https://second-brain-assistant.<ваш-поддомен>.workers.dev` — его и «общий
токен» из третьей команды нужно будет вставить в приложении: Настройки →
Помощник.

## Проверка

```bash
curl -X POST https://second-brain-assistant.<ваш-поддомен>.workers.dev/assistant \
  -H "Authorization: Bearer <общий токен>" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-opus-5","max_tokens":16,"messages":[{"role":"user","content":"Скажи ОК"}]}'
```

Ответ — обычный JSON от Anthropic Messages API. Без заголовка `Authorization`
или с неверным токеном — `401`.

## Изменение ключей

Секреты можно заменить в любой момент той же командой `wrangler secret put`
— она перезаписывает значение, ничего не удаляя из приложения на клиенте.
