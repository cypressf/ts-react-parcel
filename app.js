const express = require('express')
const proxy = require('http-proxy-middleware')
const Bundler = require('parcel-bundler')

const app = express()

const bundler = new Bundler('src/index.html', {
  cache: false
})

const port = process.env.PORT || 8000;

app.use('/api', proxy({
  target: 'https://www.sakugabooru.com',
  changeOrigin: true,
  pathRewrite: { '^/api': '' }
}))
app.use(bundler.middleware())
app.listen(port)