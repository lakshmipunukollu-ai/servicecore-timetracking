.PHONY: dev test seed build migrate install

install:
	cd api && npm install
	cd dashboard && npm install

dev:
	cd api && npm run dev

test:
	cd api && npm test

seed:
	cd api && npm run migrate && npm run seed

build:
	cd api && npm install
	cd dashboard && npm install && npm run build

migrate:
	cd api && npm run migrate
