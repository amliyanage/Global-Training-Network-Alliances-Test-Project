.PHONY: up down up-f shell

up:
	docker compose up backend

down:
	docker compose down

up-f:
	docker compose up -d

shell:
	docker compose exec backend sh

log:
	docker compose logs -f