// Cloudflare Pages Functions middleware for client-side routing

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // Handle invisibleink routes - serve index.html for all paths
  if (url.pathname.startsWith('/invisibleink/')) {
    // Check if it's a static file
    if (url.pathname.match(/\.(js|css|png|jpg|json|html)$/)) {
      return context.next();
    }

    // Rewrite to serve invisibleink/index.html
    url.pathname = '/invisibleink/index.html';
    return context.env.ASSETS.fetch(url);
  }

  return context.next();
}
