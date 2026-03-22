<?php
echo "<h2>Проверка БД DDoS Game</h2>";

require_once 'db_config.php';
echo "<p style='color:green'>✅ Подключение к БД работает</p>";

$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
echo "<p>📋 Таблицы в базе данных:</p><ul>";
foreach ($tables as $table) {
    echo "<li>$table</li>";
}
echo "</ul>";

echo "<p>🌐 API доступен: <a href='api.php?action=get_top' target='_blank'>api.php?action=get_top</a></p>";
?>