set quiet := true

init:
    npm install

build:
    npm run build

format:
    npm run format

pub:
    npm run pub

update:
    npm update
    git add package.json package-lock.json
    git commit -m "feat: update packages"
    npm version patch
