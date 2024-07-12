FROM denoland/deno:alpine-1.45.1
LABEL MAINTAINER="Pablo Villaverde <https://github.com/pvillaverde>"

ENV TZ Europe/Madrid
RUN apk --no-cache add tzdata
# build app directory and cache dependencies
WORKDIR /opt/galnet_news
#COPY ./src/deps.ts /opt/galnet_news/src/
#COPY ./deno.json /opt/galnet_news/
#RUN deno cache ./src/deps.ts
## Now we copy our App source code, having the dependencies previously cached if possible.
ADD . /opt/galnet_news/
ADD ./src/config_example /opt/galnet_news/src/config
RUN deno cache ./src/main.ts
#ENTRYPOINT /opt/galnet_news/entrypoint.sh
