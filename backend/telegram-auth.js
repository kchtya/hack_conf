const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const app = express();

app.use(express.json());

// токен бота (при создании появился)
const BOT_TOKEN = '8670201639:AAF-rL6tld6mK2VCfbSAsGHFeUGHWVwM0bA'; // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// проверка подписи
function verifyTelegramAuth(data) {
    const { hash, ...authData } = data;
    
    // ключи и проверка
    const checkString = Object.keys(authData)
        .sort()
        .map(key => `${key}=${authData[key]}`)
        .join('\n');
    
    // секретный ключ
    const secretKey = crypto.createHash('sha256')
        .update(BOT_TOKEN)
        .digest();
    
    // HMAC-SHA256
    const computedHash = crypto.createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');
    
    return computedHash === hash;
}

// эндпоинт для авторизации
app.post('/api/telegram-auth', (req, res) => {
    const authData = req.body;
    
    // проверка подписи
    if (!verifyTelegramAuth(authData)) {
        return res.status(401).json({ error: 'Неверная подпись' });
    }
    
    // проверка была ли авторизация больше суток
    const authDate = new Date(authData.auth_date * 1000);
    const now = new Date();
    const hoursDiff = (now - authDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        return res.status(401).json({ error: 'Срок авторизации истек' });
    }
    
    // данные пользователя
    const user = {
        telegramId: authData.id,
        firstName: authData.first_name,
        lastName: authData.last_name || '',
        username: authData.username || '',
        photoUrl: authData.photo_url || '',
        authDate: authData.auth_date
    };
    
    // токен сессии (генерация)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // сохранение в бд
    
    res.json({
        success: true,
        token: sessionToken,
        user: {
            firstName: user.firstName,
            lastName: user.lastName,
            telegramId: user.telegramId,
            username: user.username
        }
    });
});

app.listen(3000, () => {
    console.log('Telegram auth server running on port 3000');
});  //ЕЩЕ ЕСТЬ ИЗМЕНЕНИЯ ВО ФРОНТЕНДЕ - app.js - telegramAuth()