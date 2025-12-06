FROM tomcat:9-jre17

# Установка необходимых утилит
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Скачивание и установка BIMserver
# Используем последнюю стабильную версию BIMserver
ENV BIMSERVER_VERSION=1.5.183
ENV BIMSERVER_URL=https://github.com/opensourceBIM/BIMserver/releases/download/v${BIMSERVER_VERSION}/bimserverwar-${BIMSERVER_VERSION}.war

# Скачивание BIMserver WAR
RUN wget -q ${BIMSERVER_URL} -O /usr/local/tomcat/webapps/bimserver.war && \
    chmod 644 /usr/local/tomcat/webapps/bimserver.war

# Создание директории для данных BIMserver
# В образе tomcat:9-jre17 используется пользователь root по умолчанию
RUN mkdir -p /var/lib/bimserver

# Настройка Tomcat
ENV CATALINA_OPTS="-Xmx2g -Xms1g -Djava.awt.headless=true"

# Открытие порта
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=120s \
  CMD curl -f http://localhost:8080/bimserver/ || exit 1

