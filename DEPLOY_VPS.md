# Деплой на VPS

## Команды для запуска на VPS:

```bash
cd /root/structura/docker
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml down
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d
```

## После git pull:

```bash
cd /root/structura
git pull
cd docker
docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --force-recreate
```

## Сервисы доступны по:

- Nextcloud: https://cloud.structura-most.ru
- BIMserver: https://bim.structura-most.ru  
- xeokit: https://viewer.structura-most.ru
- Portainer: https://port.structura-most.ru

