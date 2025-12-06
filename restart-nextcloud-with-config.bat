@echo off
chcp 65001 >nul
echo ==========================================
echo   ПЕРЕЗАПУСК NEXTCLOUD С CONFIG.PHP
echo ==========================================
echo.

cd docker

echo [1/4] Проверка существования config.php...
docker exec nextcloud test -f /var/www/html/config/config.php
if %errorlevel% equ 0 (
    echo config.php существует
) else (
    echo ОШИБКА: config.php НЕ существует!
    echo Создаю его...
    docker exec nextcloud bash -c "cat > /var/www/html/config/config.php << 'EOFCONFIG'
<?php
\$CONFIG = array (
  'passwordsalt' => 'e5OblFvxrjpUC3MPOhTtqE28AY/LGN',
  'secret' => 'sI5RXGoRxdxmR8xhoJ67upG9kRaLVLiLpDw+bsjwHqkjLBSB',
  'trusted_domains' => array (0 => 'localhost'),
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
EOFCONFIG"
    docker exec nextcloud chown www-data:www-data /var/www/html/config/config.php
    docker exec nextcloud chmod 640 /var/www/html/config/config.php
)
echo.

echo [2/4] Проверка содержимого config.php...
docker exec nextcloud head -10 /var/www/html/config/config.php
echo.

echo [3/4] Перезапуск Nextcloud...
docker compose restart nextcloud
echo.

echo [4/4] Подождите 15 секунд для перезапуска...
timeout /t 15
echo.

echo ==========================================
echo   Готово!
echo.
echo Откройте http://localhost:8081
echo Логин: admin
echo Пароль: admin
echo.
echo Если ошибка сохраняется - запустите:
echo   .\clean-nextcloud-completely.bat
echo ==========================================
echo.
pause

