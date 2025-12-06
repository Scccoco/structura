@echo off
chcp 65001 >nul
echo ==========================================
echo   ВОССТАНОВЛЕНИЕ CONFIG.PHP
echo ==========================================
echo.
echo Nextcloud уже установлен в базе данных.
echo Восстанавливаю config.php с данными из предыдущей установки.
echo.

cd docker

echo Создаю config.php...
docker exec nextcloud bash -c "cat > /var/www/html/config/config.php << 'EOF'
<?php
\$CONFIG = array (
  'passwordsalt' => 'e5OblFvxrjpUC3MPOhTtqE28AY/LGN',
  'secret' => 'sI5RXGoRxdxmR8xhoJ67upG9kRaLVLiLpDw+bsjwHqkjLBSB',
  'trusted_domains' => 
  array (
    0 => 'localhost',
  ),
  'datadirectory' => '/var/www/html/data',
  'dbtype' => 'pgsql',
  'version' => '27.1.11.3',
  'overwrite.cli.url' => 'http://localhost',
  'dbname' => 'nextcloud',
  'dbhost' => 'postgres_nc',
  'dbport' => '',
  'dbtableprefix' => 'oc_',
  'dbuser' => 'oc_admin',
  'dbpassword' => 'pKV82wapOwGtdd1aCs4YpigfReuLYv',
  'installed' => true,
  'instanceid' => 'ocsi23a4ucwq',
);
EOF"
echo.

echo Исправляю права доступа...
docker exec nextcloud chown www-data:www-data /var/www/html/config/config.php
docker exec nextcloud chmod 644 /var/www/html/config/config.php
echo.

echo Проверяю созданный файл...
docker exec nextcloud cat /var/www/html/config/config.php
echo.

echo ==========================================
echo   Готово!
echo.
echo Откройте http://localhost:8081
echo Логин: admin
echo Пароль: admin
echo ==========================================
echo.
pause

