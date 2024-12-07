function handler(event) {
  var request = event.request
  var headers = request.headers
  var host = headers.host.value
  if (host.startsWith('www.')) {
    var protocol = headers['x-forwarded-proto'] ? headers['x-forwarded-proto'].value : 'https'
    var newurl = `${protocol}://${host.substring(4)}`
    var response = {
      statusCode: 302,
      statusDescription: 'Found',
      headers:
        { "location": { "value": newurl } }
      }
    return response
  }
  request.uri = request.uri.replace(/\/$/, '\/index.html')
  return request
}
