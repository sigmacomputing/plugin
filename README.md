# Install the dependencies

```
yarn install
```

# Build a New Release

- Pull down changes from master
- Create a new branch
- Bump the version in package.json `npm version patch`
- Submit for review

After that is checked in, switch to master, and run `npm publish`
