.PHONY: dev build demo clean test

dev:
	docker-compose up --build

demo:
	cd demo && python run_demo.py

build:
	docker-compose build

test:
	cd core && cargo test
	cd verifier && python -m pytest tests/

clean:
	docker-compose down -v
	cd core && cargo clean

