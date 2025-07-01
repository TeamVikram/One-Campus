docker compose -f compose.yaml up -d
docker build -t testapp:1.0 .
docker run testapp:1.0

docker run -it testapp:1.0 bash

docker compose up --build
docker logs onecampus_backend

docker tag testapp:1.0 ranjitcjagtap/one-campus
docker push ranjitcjagtap/one-campus
