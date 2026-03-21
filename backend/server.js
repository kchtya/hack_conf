const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// токен бота
const BOT_TOKEN = '8670201639:AAF-rL6tld6mK2VCfbSAsGHFeUGHWVwM0bA';

// проверка подписи telegram
function verifyTelegramAuth(data) {
    const { hash, ...authData } = data;
    
    const checkString = Object.keys(authData)
        .sort()
        .map(key => `${key}=${authData[key]}`)
        .join('\n');
    
    const secretKey = crypto.createHash('sha256')
        .update(BOT_TOKEN)
        .digest();
    
    const computedHash = crypto.createHmac('sha256', secretKey)
        .update(checkString)
        .digest('hex');
    
    return computedHash === hash;
}

// эндпоинт для авторизации
app.post('/api/telegram-auth', (req, res) => {
    console.log('Получены данные:', req.body);
    
    const authData = req.body;
    
    if (!verifyTelegramAuth(authData)) {
        console.log('Ошибка: неверная подпись');
        return res.status(401).json({ error: 'Неверная подпись' });
    }
    
    // данным меньше суток
    const authDate = new Date(authData.auth_date * 1000);
    const now = new Date();
    const hoursDiff = (now - authDate) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
        console.log('Ошибка: срок авторизации истек');
        return res.status(401).json({ error: 'Срок авторизации истек' });
    }
    
    const user = {
        telegramId: authData.id,
        firstName: authData.first_name,
        lastName: authData.last_name || '',
        username: authData.username || '',
        photoUrl: authData.photo_url || ''
    };
    
    // токен сессии
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    console.log('Успешная авторизация:', user.firstName);
    
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

// запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Telegram auth server running on http://localhost:${PORT}`);
    console.log('BOT_TOKEN используется:', BOT_TOKEN.substring(0, 10) + '...');
});