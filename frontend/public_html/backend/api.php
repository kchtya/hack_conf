<?php
require_once 'db_config.php';

$action = $_GET['action'] ?? '';

try {
    switch($action) {
        case 'register':
            registerUser($pdo);
            break;
        case 'login':
            loginUser($pdo);
            break;
        case 'save_score':
            saveScore($pdo);
            break;
        case 'get_top':
            getTopPlayers($pdo);
            break;
        case 'get_user_stats':
            getUserStats($pdo);
            break;
        case 'delete_result':
            deleteResult($pdo);
            break;
        case 'clear_all':
            clearAllResults($pdo);
            break;
        case 'telegram_auth':
            telegramAuth($pdo);
            break;
        default:
            echo json_encode(['success' => false, 'error' => 'Неизвестное действие']);
    }
} catch(Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function registerUser($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($firstName) || empty($lastName) || empty($phone) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Все поля обязательны']);
        return;
    }
    
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'error' => 'Пароль должен быть минимум 6 символов']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'error' => 'Пользователь с таким телефоном уже существует']);
        return;
    }
    
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, phone, password) VALUES (?, ?, ?, ?)");
    $result = $stmt->execute([$firstName, $lastName, $phone, $hashedPassword]);
    
    if ($result) {
        $userId = $pdo->lastInsertId();
        
        $stmt = $pdo->prepare("INSERT INTO user_stats (user_id, best_score, total_kills) VALUES (?, 0, 0)");
        $stmt->execute([$userId]);
        
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $userId,
                'firstName' => $firstName,
                'lastName' => $lastName,
                'phone' => $phone
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Ошибка регистрации']);
    }
}

function loginUser($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $phone = trim($data['phone'] ?? '');
    $password = $data['password'] ?? '';
    
    if (empty($phone) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Телефон и пароль обязательны']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT id, first_name, last_name, phone, password FROM users WHERE phone = ?");
    $stmt->execute([$phone]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'firstName' => $user['first_name'],
                'lastName' => $user['last_name'],
                'phone' => $user['phone']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Неверный телефон или пароль']);
    }
}

function saveScore($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $userId = (int)($data['userId'] ?? 0);
    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $score = (int)($data['score'] ?? 0);
    $kills = (int)($data['kills'] ?? 0);
    
    if (!$userId || empty($firstName) || empty($lastName) || empty($phone)) {
        echo json_encode(['success' => false, 'error' => 'Недостаточно данных']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    if (!$stmt->fetch()) {
        echo json_encode(['success' => false, 'error' => 'Пользователь не найден']);
        return;
    }
    
    $stmt = $pdo->prepare("INSERT INTO tournament (user_id, first_name, last_name, phone, score, kills) VALUES (?, ?, ?, ?, ?, ?)");
    $result = $stmt->execute([$userId, $firstName, $lastName, $phone, $score, $kills]);
    
    if ($result) {
        $stmt = $pdo->prepare("
            INSERT INTO user_stats (user_id, best_score, total_kills) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                best_score = GREATEST(best_score, VALUES(best_score)),
                total_kills = total_kills + VALUES(total_kills)
        ");
        $stmt->execute([$userId, $score, $kills]);
        
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Ошибка сохранения результата']);
    }
}

function getTopPlayers($pdo) {
    $limit = min((int)($_GET['limit'] ?? 10), 100);
    
    $stmt = $pdo->prepare("
        SELECT id, user_id, first_name, last_name, phone, score, kills, 
               DATE_FORMAT(played_at, '%d.%m.%Y %H:%i') as played_at
        FROM tournament 
        ORDER BY score DESC 
        LIMIT " . intval($limit)
    );
    $stmt->execute();
    $results = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'data' => $results]);
}

function getUserStats($pdo) {
    $userId = (int)($_GET['user_id'] ?? 0);
    
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'ID пользователя не указан']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT best_score, total_kills FROM user_stats WHERE user_id = ?");
    $stmt->execute([$userId]);
    $stats = $stmt->fetch();
    
    $stmt = $pdo->prepare("
        SELECT COUNT(DISTINCT user_id) + 1 as rank 
        FROM tournament 
        WHERE score > (SELECT IFNULL(MAX(score), 0) FROM tournament WHERE user_id = ?)
    ");
    $stmt->execute([$userId]);
    $rank = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'best_score' => (int)($stats['best_score'] ?? 0),
            'total_kills' => (int)($stats['total_kills'] ?? 0),
            'rank' => $rank['rank'] ?? null
        ]
    ]);
}

function deleteResult($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    $resultId = (int)($data['result_id'] ?? 0);
    
    if (!$resultId) {
        echo json_encode(['success' => false, 'error' => 'ID результата не указан']);
        return;
    }
    
    $stmt = $pdo->prepare("DELETE FROM tournament WHERE id = ?");
    $result = $stmt->execute([$resultId]);
    
    echo json_encode(['success' => $result]);
}

function clearAllResults($pdo) {
    $stmt = $pdo->prepare("DELETE FROM tournament");
    $result = $stmt->execute();
    
    if ($result) {
        $stmt = $pdo->prepare("UPDATE user_stats SET best_score = 0, total_kills = 0");
        $stmt->execute();
    }
    
    echo json_encode(['success' => $result]);
}

function telegramAuth($pdo) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $botToken = '8670201639:AAF-rL6tld6mK2VCfbSAsGHFeUGHWVwM0bA';
    
    // Проверка наличия всех необходимых полей
    if (!isset($data['id']) || !isset($data['first_name']) || !isset($data['auth_date']) || !isset($data['hash'])) {
        echo json_encode(['success' => false, 'error' => 'Недостаточно данных от Telegram']);
        return;
    }
    
    // Формируем строку для проверки подписи
    $checkString = [];
    foreach ($data as $key => $value) {
        if ($key !== 'hash') {
            $checkString[] = "$key=$value";
        }
    }
    sort($checkString);
    $checkString = implode("\n", $checkString);
    
    // Вычисляем хеш для проверки
    $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
    $computedHash = bin2hex(hash_hmac('sha256', $checkString, $secretKey, true));
    
    // Сравниваем хеши
    if ($computedHash !== $data['hash']) {
        echo json_encode(['success' => false, 'error' => 'Неверная подпись Telegram']);
        return;
    }
    
    // Проверяем срок авторизации (не более 24 часов)
    $authDate = (int)$data['auth_date'];
    if (time() - $authDate > 86400) {
        echo json_encode(['success' => false, 'error' => 'Срок авторизации истек. Повторите вход']);
        return;
    }
    
    $telegramId = $data['id'];
    $firstName = trim($data['first_name']);
    $lastName = trim($data['last_name'] ?? '');
    $username = $data['username'] ?? '';
    $photoUrl = $data['photo_url'] ?? '';
    
    if (!$telegramId || empty($firstName)) {
        echo json_encode(['success' => false, 'error' => 'Недостаточно данных пользователя']);
        return;
    }
    
    // Проверяем, есть ли пользователь с таким telegram_id
    $stmt = $pdo->prepare("SELECT id, first_name, last_name, phone FROM users WHERE telegram_id = ?");
    $stmt->execute([$telegramId]);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        // Пользователь уже существует - выполняем вход
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $existingUser['id'],
                'firstName' => $existingUser['first_name'],
                'lastName' => $existingUser['last_name'],
                'phone' => $existingUser['phone'] ?? ''
            ]
        ]);
    } else {
        // Создаем нового пользователя
        $hashedPassword = password_hash($telegramId . '_telegram_auth', PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, phone, password, telegram_id, telegram_username) VALUES (?, ?, ?, ?, ?, ?)");
        $result = $stmt->execute([$firstName, $lastName, '', $hashedPassword, $telegramId, $username]);
        
        if ($result) {
            $userId = $pdo->lastInsertId();
            
            $stmt = $pdo->prepare("INSERT INTO user_stats (user_id, best_score, total_kills) VALUES (?, 0, 0)");
            $stmt->execute([$userId]);
            
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $userId,
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'phone' => ''
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Ошибка регистрации через Telegram']);
        }
    }
}
?>