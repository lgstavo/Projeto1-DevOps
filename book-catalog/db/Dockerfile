FROM mysql:9.3
LABEL authors="luiz"

ENV MYSQL_ROOT_PASSWORD admin
ENV MYSQL_DATABASE Usuarios
ENV MYSQL_USER user
ENV MYSQL_PASSWORD password

COPY init.sql /docker-entrypoint-initdb.d

ENTRYPOINT ["top", "-b"]

EXPOSE 3306