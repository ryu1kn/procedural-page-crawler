const http = require('http')

const server = http.createServer((req, res) => {
  const response = createResponse(req.url)
  res.writeHead(response.statusCode || 200, {'Content-Type': 'text/html'})
  res.end(response.contents)
})

server.listen(8080)

function createResponse(pageUrl) {
  switch (pageUrl) {
    case '/':
      return {
        contents: page({body: '<div id="hptl"><a href="/about">About</a></div>'})
      }
    case '/about':
      return {
        contents: page({title: 'About | Page Crawler', body: 'What is Page Crawler'})
      }
    default:
      return {
        contents: page({title: 'Not Found', body: '<p>Resource not found</p>'}),
        statusCode: 404
      }
  }
}

function page(params) {
  const head = params.title ? `<head><title>${params.title}</title></head>` : ''
  const body = params.body ? `<body>${params.body}</body>` : ''
  return `<html>${head}${body}</html>`
}