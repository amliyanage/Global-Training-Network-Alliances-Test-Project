.PHONY: dev up down shell log build

# Development: hot-reload via nodemon + tsx inside Docker
dev:
	docker compose up backend-dev mongo-express

# Production: compiled dist
up:
	docker compose up backend mongo-express

# Both services detached
up-f:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

shell:
	docker compose exec backend sh

shell-dev:
	docker compose exec backend-dev sh

log:
	docker compose logs -f