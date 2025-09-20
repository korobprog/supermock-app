# План интеграции YooMoney для автоматической оплаты

## 📋 Чек-лист интеграции YooMoney

### 1. Регистрация и настройка в YooMoney
- [ ] Создать кошелек YooMoney (если нет)
- [ ] Зарегистрировать приложение в YooMoney
  - [ ] Перейти на https://yoomoney.ru/myservices/new
  - [ ] Указать название приложения
  - [ ] Указать описание сервиса
  - [ ] Получить `client_id` и `client_secret`
- [ ] Настроить права доступа (scope):
  - [ ] `account-info` - информация о счете
  - [ ] `operation-history` - история операций
  - [ ] `operation-details` - детали операций
  - [ ] `incoming-transfers` - входящие переводы

### 2. Настройка HTTP-уведомлений
- [ ] В настройках кошелька включить HTTP-уведомления
- [ ] Указать URL для уведомлений: `https://ваш-домен.com/api/payments/yoomoney/webhook`
- [ ] Получить секретное слово для проверки подлинности
- [ ] Протестировать уведомления (кнопка "Протестировать")

### 3. Разработка платежной формы
- [ ] Создать компонент PaymentForm
- [ ] Реализовать форму с параметрами:
  - [ ] `receiver` - номер кошелька
  - [ ] `quickpay-form` = "shop"
  - [ ] `targets` - назначение платежа
  - [ ] `sum` - сумма
  - [ ] `paymentType` - способ оплаты (PC/AC)
  - [ ] `label` - уникальная метка платежа
  - [ ] `successURL` - URL успешной оплаты
  - [ ] `failURL` - URL неудачной оплаты

### 4. Серверная часть - обработка уведомлений
- [ ] Создать endpoint для webhook: `/api/payments/yoomoney/webhook`
- [ ] Реализовать проверку подлинности уведомления:
  - [ ] Проверить `sha1_hash` параметр
  - [ ] Вычислить хэш по формуле: `notification_type&operation_id&amount&currency&datetime&sender&codepro&notification_secret&label`
  - [ ] Сравнить с полученным `sha1_hash`
- [ ] Обработать параметры уведомления:
  - [ ] `operation_id` - ID операции
  - [ ] `notification_type` - тип уведомления
  - [ ] `amount` - сумма
  - [ ] `currency` - валюта (643 для рублей)
  - [ ] `datetime` - дата и время
  - [ ] `sender` - отправитель
  - [ ] `label` - метка платежа
  - [ ] `test_notification` - флаг тестового уведомления

### 5. База данных - модели платежей
- [ ] Создать модель Payment в Prisma:
  ```prisma
  model Payment {
    id            String   @id @default(cuid())
    operationId   String   @unique
    amount        Decimal
    currency      String   @default("643")
    status        PaymentStatus @default(PENDING)
    label         String?  // метка платежа
    sender        String?  // отправитель
    userId        String?  // ID пользователя
    productId     String?  // ID продукта
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt
    user          User?    @relation(fields: [userId], references: [id])
    product       Product? @relation(fields: [productId], references: [id])
  }

  enum PaymentStatus {
    PENDING
    COMPLETED
    FAILED
    REFUNDED
  }
  ```
- [ ] Создать миграцию базы данных
- [ ] Обновить seed файл

### 6. Логика предоставления доступа
- [ ] При получении уведомления о платеже:
  - [ ] Найти платеж по `operation_id`
  - [ ] Проверить статус платежа
  - [ ] Если платеж успешен:
    - [ ] Обновить статус на COMPLETED
    - [ ] Предоставить доступ к продукту пользователю
    - [ ] Отправить уведомление пользователю
    - [ ] Записать в лог

### 7. API endpoints
- [ ] `POST /api/payments/yoomoney/webhook` - обработка уведомлений
- [ ] `GET /api/payments/status/:operationId` - статус платежа
- [ ] `POST /api/payments/create` - создание платежа
- [ ] `GET /api/payments/user/:userId` - платежи пользователя

### 8. Безопасность
- [ ] Использовать HTTPS для всех запросов
- [ ] Проверять подлинность всех уведомлений
- [ ] Логировать все операции с платежами
- [ ] Хранить секретные ключи в переменных окружения
- [ ] Реализовать rate limiting для webhook endpoint

### 9. Тестирование
- [ ] Создать тестовые платежи
- [ ] Проверить обработку уведомлений
- [ ] Протестировать предоставление доступа
- [ ] Проверить обработку ошибок
- [ ] Тестировать с разными суммами и валютами

### 10. Мониторинг и логирование
- [ ] Настроить логирование всех платежных операций
- [ ] Создать дашборд для мониторинга платежей
- [ ] Настроить алерты при ошибках
- [ ] Реализовать систему уведомлений администратора

## 🔧 Технические детали

### Формат уведомления YooMoney
```
notification_type=p2p-incoming
operation_id=904035776918098009
datetime=2014-04-28T16:31:28Z
sha1_hash=8693ddf402fe5dcc4c4744d466cabada2628148c
sender=41003188981230
codepro=false
currency=643
amount=0.99
withdraw_amount=1.00
label=YM.label.12345
```

### Проверка подлинности
```javascript
const crypto = require('crypto');

function verifyYooMoneyNotification(params, secret) {
  const string = [
    params.notification_type,
    params.operation_id,
    params.amount,
    params.currency,
    params.datetime,
    params.sender,
    params.codepro,
    secret,
    params.label || ''
  ].join('&');
  
  const hash = crypto.createHash('sha1').update(string).digest('hex');
  return hash === params.sha1_hash;
}
```

### Пример платежной формы
```html
<form method="POST" action="https://yoomoney.ru/quickpay/confirm.xml">
  <input type="hidden" name="receiver" value="41003188981230">
  <input type="hidden" name="quickpay-form" value="shop">
  <input type="hidden" name="targets" value="Оплата доступа к SuperMock">
  <input type="hidden" name="sum" value="100.00" data-type="number">
  <input type="hidden" name="paymentType" value="AC">
  <input type="hidden" name="label" value="payment_12345">
  <input type="hidden" name="successURL" value="https://supermock.com/payment/success">
  <input type="hidden" name="failURL" value="https://supermock.com/payment/fail">
  <button type="submit">Оплатить 100 ₽</button>
</form>
```

## 🌍 Поддерживаемые страны
- Россия (основной рынок)
- Беларусь
- Казахстан
- Армения
- Кыргызстан
- Молдова
- Узбекистан

## 📱 Мобильная поддержка
- [ ] Адаптировать платежную форму для мобильных устройств
- [ ] Реализовать deep links для мобильных приложений
- [ ] Поддержка YooMoney мобильного приложения

## 💡 Дополнительные возможности
- [ ] Возвраты (refunds)
- [ ] Подписки и рекуррентные платежи
- [ ] Промокоды и скидки
- [ ] Интеграция с CRM системой
- [ ] Аналитика платежей
