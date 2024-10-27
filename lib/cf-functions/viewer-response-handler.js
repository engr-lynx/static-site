function handler(event) {
  var response = event.response
  var headers = response.headers
  headers['content-security-policy'] = {
    value: "object-src 'self' {{objectSrc}};\
      frame-src 'self' {{frameSrc}};\
      media-src 'self' {{mediaSrc}};\
      img-src 'self' {{imgSrc}};\
      style-src 'self' {{styleSrc}};\
      font-src 'self' {{fontSrc}};\
      script-src 'self' {{scriptSrc}};\
      prefetch-src 'self' {{prefetchSrc}};\
      connect-src 'self' {{connectSrc}};\
      default-src 'none'",
  }
  headers['permissions-policy'] = {
    value: 'camera=(), microphone=()',
  }
  headers['x-dns-prefetch-control'] = {
    value: 'on',
  }
  headers['x-content-type-options'] = {
    value: 'nosniff',
  }
  return response
}
