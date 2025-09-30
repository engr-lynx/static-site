function handler(event) {
  var request = event.request
  if (!/\.[^/]+$/.test(request.uri)) {
    request.uri = request.uri.replace(/\/$/, '') + '/index.html'
  }
  return request
}
